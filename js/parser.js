/**
 * ConverterParser - Interface with Mammoth.js to parse Word documents into clean DOM structures.
 */
(function(window) {
    'use strict';

    const ConverterParser = {
        parseDocument: function(arrayBuffer, options = {}, callback) {
            if (typeof mammoth === 'undefined') {
                callback(new Error('Mammoth.js library is not loaded.'), null);
                return;
            }

            mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options)
                .then(function(result) {
                    const rawHtml = result.value;
                    const messages = result.messages || [];
                    
                    const domTree = ConverterParser.cleanAndParseDom(rawHtml);
                    callback(null, {
                        domTree: domTree,
                        rawHtml: rawHtml,
                        messages: messages
                    });
                })
                .catch(function(err) {
                    callback(err, null);
                });
        },

        cleanAndParseDom: function(rawHtml) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawHtml, 'text/html');
            const body = doc.body;

            // Pre-process elements: identify bold paragraphs styled as headings
            const children = Array.from(body.children);
            let hasH1 = body.querySelector('h1') !== null;
            let hasH2 = body.querySelector('h2') !== null;

            children.forEach(el => {
                if (el.tagName.toUpperCase() === 'P') {
                    const text = el.textContent.trim();
                    const isSingleBoldChild = el.children.length === 1 && 
                        (el.children[0].tagName.toUpperCase() === 'STRONG' || el.children[0].tagName.toUpperCase() === 'B');
                    
                    const childNodes = Array.from(el.childNodes);
                    const isFullyBold = isSingleBoldChild || 
                        (childNodes.length === 1 && childNodes[0].nodeType === Node.ELEMENT_NODE && 
                         (childNodes[0].tagName.toUpperCase() === 'STRONG' || childNodes[0].tagName.toUpperCase() === 'B'));

                    // Convert short, non-period-ending bold paragraphs into appropriate heading levels
                    if (isFullyBold && text.length > 0 && text.length < 80 && !text.endsWith('.')) {
                        let targetHeading = 'h2';
                        if (!hasH1) {
                            targetHeading = 'h1';
                            hasH1 = true;
                        } else if (!hasH2) {
                            targetHeading = 'h2';
                            hasH2 = true;
                        } else {
                            targetHeading = 'h3';
                        }

                        const hTag = document.createElement(targetHeading);
                        hTag.innerHTML = el.querySelector('strong, b').innerHTML;
                        el.parentNode.replaceChild(hTag, el);
                    }
                }
            });

            return body;
        }
    };

    window.ConverterParser = ConverterParser;
})(window);
