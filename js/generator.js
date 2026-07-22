/**
 * ConverterGenerator - Transforms parsed DOM nodes into configured HTML output.
 * Ensures NO automatic tag injection occurs and NO headings or sections are lost.
 */
(function(window) {
    'use strict';

    const ConverterGenerator = {
        generate: function(domTree, config) {
            if (!domTree) return '';
            const cfg = config || window.ConverterConfig.get();

            // Apply Hyperlink Manager Rules to DOM Tree
            if (window.LinkManager && cfg.links && cfg.links.length > 0) {
                window.LinkManager.applyRules(domTree, cfg.links);
            }

            // Segment DOM tree into sections (by Headings) or root elements
            const childNodes = Array.from(domTree.children);
            const sections = [];
            let currentSection = null;

            childNodes.forEach(el => {
                const tagName = el.tagName.toUpperCase();
                if (tagName.match(/^H[1-6]$/)) {
                    if (currentSection) sections.push(currentSection);
                    currentSection = {
                        heading: el,
                        children: []
                    };
                } else {
                    if (!currentSection) {
                        currentSection = {
                            heading: null,
                            children: []
                        };
                    }
                    currentSection.children.push(el);
                }
            });
            if (currentSection) sections.push(currentSection);

            // Transform each element inside sections according to rules
            const generatedHtmlSections = sections.map(sec => {
                let headingPartHtml = '';
                if (sec.heading) {
                    const transformedH = ConverterGenerator.transformHeading(sec.heading, cfg);
                    if (transformedH) {
                        const hHtml = transformedH.outerHTML || '';
                        if (cfg.wrapper && cfg.wrapper.headingParentTag && cfg.wrapper.headingParentTag.trim()) {
                            headingPartHtml = ConverterGenerator.wrapContent(hHtml, {
                                tag: cfg.wrapper.headingParentTag,
                                class: cfg.wrapper.headingParentClass
                            });
                        } else {
                            headingPartHtml = hHtml;
                        }
                    }
                }

                const transformedChildren = [];
                sec.children.forEach(child => {
                    const transformed = ConverterGenerator.transformElement(child, cfg);
                    if (transformed) {
                        if (Array.isArray(transformed)) {
                            transformedChildren.push(...transformed.filter(Boolean));
                        } else {
                            transformedChildren.push(transformed);
                        }
                    }
                });

                let contentPartHtml = '';
                if (transformedChildren.length > 0) {
                    const childrenInnerHtml = transformedChildren.map(el => (typeof el === 'string' ? el : el.outerHTML || '')).filter(Boolean).join('\n');
                    if (cfg.wrapper && cfg.wrapper.contentParentTag && cfg.wrapper.contentParentTag.trim()) {
                        contentPartHtml = ConverterGenerator.wrapContent(childrenInnerHtml, {
                            tag: cfg.wrapper.contentParentTag,
                            class: cfg.wrapper.contentParentClass
                        });
                    } else {
                        contentPartHtml = childrenInnerHtml;
                    }
                }

                const parts = [headingPartHtml, contentPartHtml].filter(Boolean);
                const sectionInnerHtml = parts.join('\n');

                if (cfg.wrapper && cfg.wrapper.mode === 'repeat' && cfg.wrapper.tag && cfg.wrapper.tag.trim()) {
                    return ConverterGenerator.wrapContent(sectionInnerHtml, cfg.wrapper);
                } else {
                    return sectionInnerHtml;
                }
            }).filter(Boolean);

            let combinedOutput = generatedHtmlSections.join('\n\n');

            // Apply Single Parent Wrapper if Mode B
            if (cfg.wrapper && cfg.wrapper.mode === 'single' && cfg.wrapper.tag && cfg.wrapper.tag.trim()) {
                combinedOutput = ConverterGenerator.wrapContent(combinedOutput, cfg.wrapper);
            }

            // Prepend Start Code and Append End Code
            if (cfg.startCode && cfg.startCode.trim()) {
                combinedOutput = cfg.startCode + '\n' + combinedOutput;
            }
            if (cfg.endCode && cfg.endCode.trim()) {
                combinedOutput = combinedOutput + '\n' + cfg.endCode;
            }

            return combinedOutput;
        },

        wrapContent: function(contentHtml, wrapperCfg) {
            if (!contentHtml || !contentHtml.trim()) return '';
            if (!wrapperCfg || !wrapperCfg.tag || !wrapperCfg.tag.trim()) return contentHtml;

            const tag = wrapperCfg.tag.trim();
            const wrapper = document.createElement(tag);

            if (wrapperCfg.class && wrapperCfg.class.trim()) {
                wrapper.className = wrapperCfg.class.trim();
            }
            if (wrapperCfg.id && wrapperCfg.id.trim()) {
                wrapper.id = wrapperCfg.id.trim();
            }
            if (wrapperCfg.attrs && wrapperCfg.attrs.trim()) {
                ConverterGenerator.applyCustomAttributes(wrapper, wrapperCfg.attrs);
            }

            wrapper.innerHTML = contentHtml;
            return wrapper.outerHTML;
        },

        getHeadingConfig: function(level, cfg) {
            const headings = (cfg && cfg.headings) ? cfg.headings : {};
            const levelKey = level.toLowerCase();
            const candidates = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

            function validHeadingConfig(entry) {
                return entry && entry.tag && entry.tag.trim();
            }

            if (validHeadingConfig(headings[levelKey])) {
                return headings[levelKey];
            }

            for (let i = 0; i < candidates.length; i++) {
                const candidate = candidates[i];
                if (candidate === levelKey) continue;
                if (validHeadingConfig(headings[candidate])) {
                    return headings[candidate];
                }
            }

            return { tag: level, class: '' };
        },

        transformHeading: function(hEl, cfg) {
            const level = hEl.tagName.toLowerCase(); // 'h1'..'h6'
            const hCfg = ConverterGenerator.getHeadingConfig(level, cfg);

            const outTag = hCfg.tag.trim();
            const newEl = document.createElement(outTag);

            if (hCfg.class && hCfg.class.trim()) {
                newEl.className = hCfg.class.trim();
            }

            // Clean heading inner HTML: unwrap automatic <strong>/<b> if it wraps entire heading text
            let innerHtml = hEl.innerHTML.trim();
            innerHtml = ConverterGenerator.unwrapFullBoldTag(innerHtml);

            newEl.innerHTML = innerHtml;
            return newEl;
        },

        transformElement: function(el, cfg) {
            const tag = el.tagName.toUpperCase();

            // Paragraph
            if (tag === 'P') {
                // Check if paragraph contains only an image
                if (el.children.length === 1 && el.children[0].tagName.toUpperCase() === 'IMG') {
                    return ConverterGenerator.transformImage(el.children[0], cfg);
                }

                // Skip empty paragraphs with no text and no images
                if (el.textContent.trim() === '' && el.querySelectorAll('img').length === 0) {
                    return null;
                }

                const pCfg = cfg.paragraph || { tag: 'p', class: '' };
                const outTag = (pCfg.tag && pCfg.tag.trim()) ? pCfg.tag.trim() : 'p';
                const newEl = document.createElement(outTag);

                if (pCfg.class && pCfg.class.trim()) {
                    newEl.className = pCfg.class.trim();
                }

                let innerHtml = el.innerHTML.trim();
                // Clean paragraph inner HTML: unwrap automatic <strong>/<b> if it wraps entire paragraph text
                innerHtml = ConverterGenerator.unwrapFullBoldTag(innerHtml);

                newEl.innerHTML = innerHtml;
                return newEl;
            }

            // Lists: UL / OL
            if (tag === 'UL' || tag === 'OL') {
                const listType = tag.toLowerCase(); // 'ul' or 'ol'
                const listCfg = (cfg.list && cfg.list[listType]) ? cfg.list[listType] : { tag: listType, class: '' };
                const outTag = (listCfg.tag && listCfg.tag.trim()) ? listCfg.tag.trim() : listType;
                const newEl = document.createElement(outTag);

                if (listCfg.class && listCfg.class.trim()) {
                    newEl.className = listCfg.class.trim();
                }

                // Process LI children
                const liNodes = Array.from(el.querySelectorAll('li'));
                liNodes.forEach(li => {
                    const liCfg = (cfg.list && cfg.list.li) ? cfg.list.li : { tag: 'li', class: '' };
                    const liTag = (liCfg.tag && liCfg.tag.trim()) ? liCfg.tag.trim() : 'li';
                    const newLi = document.createElement(liTag);

                    if (liCfg.class && liCfg.class.trim()) {
                        newLi.className = liCfg.class.trim();
                    }

                    let liInnerHtml = li.innerHTML.trim();
                    liInnerHtml = ConverterGenerator.unwrapFullBoldTag(liInnerHtml);

                    newLi.innerHTML = liInnerHtml;
                    newEl.appendChild(newLi);
                });

                return newEl;
            }

            // Table
            if (tag === 'TABLE') {
                return ConverterGenerator.transformTable(el, cfg);
            }

            // Image
            if (tag === 'IMG') {
                return ConverterGenerator.transformImage(el, cfg);
            }

            // Default fallback
            return el.cloneNode(true);
        },

        transformTable: function(tableEl, cfg) {
            const tCfg = cfg.table || {};
            const tableRule = tCfg.table || { tag: 'table', class: '' };

            const outTableTag = (tableRule.tag && tableRule.tag.trim()) ? tableRule.tag.trim() : 'table';
            const newTable = document.createElement(outTableTag);

            if (tableRule.class && tableRule.class.trim()) newTable.className = tableRule.class.trim();
            if (tableRule.attrs && tableRule.attrs.trim()) ConverterGenerator.applyCustomAttributes(newTable, tableRule.attrs);

            // Wrap table in optional parent wrapper when configured
            let outputNode = newTable;
            if (tCfg.wrapper && tCfg.wrapper.tag && tCfg.wrapper.tag.trim()) {
                const wrapperTag = tCfg.wrapper.tag.trim();
                const wrapper = document.createElement(wrapperTag);
                if (tCfg.wrapper.class && tCfg.wrapper.class.trim()) wrapper.className = tCfg.wrapper.class.trim();
                if (tCfg.wrapper.attrs && tCfg.wrapper.attrs.trim()) ConverterGenerator.applyCustomAttributes(wrapper, tCfg.wrapper.attrs);
                wrapper.appendChild(newTable);
                outputNode = wrapper;
            }

            // Structure: thead, tbody, tfoot, tr, th, td
            ['thead', 'tbody', 'tfoot'].forEach(secName => {
                const secEl = tableEl.querySelector(secName);
                if (secEl) {
                    const secRule = tCfg[secName] || { tag: secName, class: '' };
                    const secOutTag = (secRule.tag && secRule.tag.trim()) ? secRule.tag.trim() : secName;
                    const newSec = document.createElement(secOutTag);

                    if (secRule.class && secRule.class.trim()) newSec.className = secRule.class.trim();
                    if (secRule.attrs && secRule.attrs.trim()) ConverterGenerator.applyCustomAttributes(newSec, secRule.attrs);

                    const rows = Array.from(secEl.querySelectorAll('tr'));
                    rows.forEach(tr => {
                        const trRes = ConverterGenerator.transformTableRow(tr, tCfg);
                        if (trRes) newSec.appendChild(trRes);
                    });

                    if (newSec.children.length > 0) {
                        newTable.appendChild(newSec);
                    }
                }
            });

            // Direct TR children if no thead/tbody
            if (newTable.children.length === 0) {
                const rows = Array.from(tableEl.querySelectorAll('tr'));
                rows.forEach(tr => {
                    const trRes = ConverterGenerator.transformTableRow(tr, tCfg);
                    if (trRes) newTable.appendChild(trRes);
                });
            }

            return outputNode;
        },

        transformTableRow: function(trEl, tCfg) {
            const trRule = tCfg.tr || { tag: 'tr', class: '' };
            const trOutTag = (trRule.tag && trRule.tag.trim()) ? trRule.tag.trim() : 'tr';
            const newTr = document.createElement(trOutTag);

            if (trRule.class && trRule.class.trim()) newTr.className = trRule.class.trim();
            if (trRule.attrs && trRule.attrs.trim()) ConverterGenerator.applyCustomAttributes(newTr, trRule.attrs);

            const cells = Array.from(trEl.children); // th or td
            cells.forEach(cell => {
                const cellTag = cell.tagName.toLowerCase(); // 'th' or 'td'
                const cellRule = tCfg[cellTag] || { tag: cellTag, class: '', innerTag: '', innerClass: '' };

                const cellOutTag = (cellRule.tag && cellRule.tag.trim()) ? cellRule.tag.trim() : cellTag;
                const newCell = document.createElement(cellOutTag);

                if (cellRule.class && cellRule.class.trim()) newCell.className = cellRule.class.trim();
                if (cellRule.attrs && cellRule.attrs.trim()) ConverterGenerator.applyCustomAttributes(newCell, cellRule.attrs);

                // Handle cell inner content: NEVER inject <p> unless innerTag is explicitly configured
                let rawInnerHtml = cell.innerHTML.trim();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = rawInnerHtml;

                // Strip any default <p> tags injected by Mammoth inside table cells
                const pChildren = Array.from(tempDiv.children).filter(child => child.tagName === 'P');
                let cellTextContent = rawInnerHtml;
                if (pChildren.length > 0 && tempDiv.children.length === pChildren.length) {
                    cellTextContent = pChildren.map(p => p.innerHTML.trim()).join(' ');
                }

                if (cellRule.innerTag && cellRule.innerTag.trim()) {
                    const innerTagEl = document.createElement(cellRule.innerTag.trim());
                    if (cellRule.innerClass && cellRule.innerClass.trim()) {
                        innerTagEl.className = cellRule.innerClass.trim();
                    }
                    innerTagEl.innerHTML = cellTextContent;
                    newCell.appendChild(innerTagEl);
                } else {
                    newCell.innerHTML = cellTextContent;
                }

                newTr.appendChild(newCell);
            });

            return newTr;
        },

        transformImage: function(imgEl, cfg) {
            if (!imgEl || !imgEl.getAttribute('src') || !imgEl.getAttribute('src').trim()) {
                return null; // Do NOT generate <img src="" alt=""> if no image source exists
            }

            const imgCfg = cfg.image || {};
            const newImg = document.createElement('img');

            newImg.src = imgEl.getAttribute('src').trim();
            if (imgCfg.class && imgCfg.class.trim()) newImg.className = imgCfg.class.trim();
            if (imgCfg.loading && imgCfg.loading.trim()) newImg.setAttribute('loading', imgCfg.loading.trim());
            if (imgCfg.decoding && imgCfg.decoding.trim()) newImg.setAttribute('decoding', imgCfg.decoding.trim());
            if (imgCfg.alt !== undefined && imgCfg.alt.trim() !== '') newImg.alt = imgCfg.alt.trim();
            else if (imgEl.hasAttribute('alt')) newImg.alt = imgEl.getAttribute('alt');
            if (imgCfg.width && imgCfg.width.trim()) newImg.setAttribute('width', imgCfg.width.trim());
            if (imgCfg.height && imgCfg.height.trim()) newImg.setAttribute('height', imgCfg.height.trim());

            // Image wrapper only if explicitly configured
            if (imgCfg.wrapperTag && imgCfg.wrapperTag.trim()) {
                const wrapper = document.createElement(imgCfg.wrapperTag.trim());
                if (imgCfg.wrapperClass && imgCfg.wrapperClass.trim()) {
                    wrapper.className = imgCfg.wrapperClass.trim();
                }
                wrapper.appendChild(newImg);
                return wrapper;
            }

            return newImg;
        },

        unwrapFullBoldTag: function(htmlStr) {
            if (!htmlStr) return '';
            const temp = document.createElement('div');
            temp.innerHTML = htmlStr.trim();

            if (temp.children.length === 1 && (temp.children[0].tagName === 'STRONG' || temp.children[0].tagName === 'B')) {
                if (temp.textContent.trim() === temp.children[0].textContent.trim()) {
                    return temp.children[0].innerHTML.trim();
                }
            }
            return htmlStr;
        },

        applyCustomAttributes: function(el, attrString) {
            if (!attrString) return;
            const matches = attrString.match(/([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"']+)))?/g);
            if (matches) {
                matches.forEach(attr => {
                    const parts = attr.split('=');
                    const key = parts[0].trim();
                    let val = parts[1] ? parts[1].trim() : '';
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.substring(1, val.length - 1);
                    }
                    if (key) el.setAttribute(key, val);
                });
            }
        }
    };

    window.ConverterGenerator = ConverterGenerator;
})(window);
