/**
 * LinkManager - Advanced rule engine for hyperlinking target phrases in DOM trees.
 * Handles phrases spanning across inline formatting tags (<strong>, <b>, <em>, <span>),
 * case sensitivity, and bold-only matching.
 */
(function(window) {
    'use strict';

    const LinkManager = {
        applyRules: function(containerEl, rules = []) {
            if (!containerEl || !rules || rules.length === 0) return;

            // Filter out empty rules
            const activeRules = rules.filter(r => r.target && r.target.trim() && r.url && r.url.trim());
            if (activeRules.length === 0) return;

            activeRules.forEach(rule => {
                const targetText = rule.target.trim();
                const url = rule.url.trim();
                const targetAttr = rule.targetAttr || '';
                const title = rule.title || '';
                const rel = rule.rel || '';
                const caseSensitive = !!rule.caseSensitive;
                const boldOnly = !!rule.boldOnly;

                LinkManager.processSingleRule(containerEl, {
                    targetText,
                    url,
                    targetAttr,
                    title,
                    rel,
                    caseSensitive,
                    boldOnly
                });
            });
        },

        processSingleRule: function(root, rule) {
            const blocks = Array.from(root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th'));
            if (blocks.length === 0) {
                blocks.push(root);
            }

            const flags = rule.caseSensitive ? 'g' : 'gi';
            const regexPattern = LinkManager.escapeRegex(rule.targetText);

            blocks.forEach(block => {
                const textContent = block.textContent;
                if (!textContent || !textContent.trim()) return;

                const regex = new RegExp(regexPattern, flags);
                let match;

                const matches = [];
                while ((match = regex.exec(textContent)) !== null) {
                    matches.push({
                        start: match.index,
                        end: match.index + match[0].length,
                        text: match[0]
                    });
                    if (match[0].length === 0) break;
                }

                // Process matches from last to first
                for (let i = matches.length - 1; i >= 0; i--) {
                    const m = matches[i];
                    const range = LinkManager.findRangeByTextOffsets(block, m.start, m.end);
                    if (!range) continue;

                    if (rule.boldOnly) {
                        // Find bold elements (strong, b) within or around this matched phrase
                        const rangeContainer = range.commonAncestorContainer;
                        let boldNodes = [];

                        if (rangeContainer.nodeType === Node.ELEMENT_NODE) {
                            boldNodes = Array.from(rangeContainer.querySelectorAll('strong, b')).filter(bEl => {
                                try { return range.intersectsNode(bEl); } catch(e) { return true; }
                            });
                        } else if (rangeContainer.parentElement) {
                            const parentBold = rangeContainer.parentElement.closest('strong, b');
                            if (parentBold) boldNodes.push(parentBold);
                        }

                        // If bold elements are found inside the matched phrase, wrap ONLY the bold elements in <a>
                        if (boldNodes.length > 0) {
                            boldNodes.forEach(bEl => {
                                if (bEl.closest('a') || bEl.querySelector('a')) return;

                                const a = document.createElement('a');
                                a.href = rule.url;
                                if (rule.targetAttr) a.target = rule.targetAttr;
                                if (rule.title) a.title = rule.title;
                                if (rule.rel) a.rel = rule.rel;
                                a.innerHTML = bEl.innerHTML;

                                if (bEl.parentNode) {
                                    bEl.parentNode.replaceChild(a, bEl);
                                }
                            });
                        }
                    } else {
                        // When boldOnly is false, wrap the entire matched phrase in <a>
                        const a = document.createElement('a');
                        a.href = rule.url;
                        if (rule.targetAttr) a.target = rule.targetAttr;
                        if (rule.title) a.title = rule.title;
                        if (rule.rel) a.rel = rule.rel;

                        try {
                            range.surroundContents(a);
                        } catch (e) {
                            const contents = range.extractContents();
                            a.appendChild(contents);
                            range.insertNode(a);
                        }
                    }
                }
            });
        },

        findRangeByTextOffsets: function(root, startCharIndex, endCharIndex) {
            const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            let currentCharCount = 0;
            let startNode = null, startOffset = 0;
            let endNode = null, endOffset = 0;

            let currentNode = treeWalker.nextNode();
            while (currentNode) {
                if (currentNode.parentElement && currentNode.parentElement.closest('a')) {
                    currentNode = treeWalker.nextNode();
                    continue;
                }

                const nodeLength = currentNode.nodeValue.length;
                if (!startNode && currentCharCount + nodeLength >= startCharIndex) {
                    startNode = currentNode;
                    startOffset = startCharIndex - currentCharCount;
                }
                if (!endNode && currentCharCount + nodeLength >= endCharIndex) {
                    endNode = currentNode;
                    endOffset = endCharIndex - currentCharCount;
                    break;
                }
                currentCharCount += nodeLength;
                currentNode = treeWalker.nextNode();
            }

            if (startNode && endNode) {
                const range = document.createElement('div').ownerDocument.createRange();
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                return range;
            }
            return null;
        },

        escapeRegex: function(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
    };

    window.LinkManager = LinkManager;
})(window);
