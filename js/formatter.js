/**
 * ConverterFormatter - Beautifies and indents HTML output cleanly.
 */
(function(window) {
    'use strict';

    const ConverterFormatter = {
        formatHtml: function(htmlString, indentSize = 4) {
            if (!htmlString || !htmlString.trim()) return '';

            const indentStr = ' '.repeat(indentSize);
            const voidElements = ['AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR'];

            // Tokenize HTML tags and text content
            const tokens = htmlString.replace(/>\s+</g, '><').trim().split(/(<[^>]+>)/g).filter(t => t.trim() !== '');

            let currentIndent = 0;
            let resultLines = [];

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i].trim();
                if (!token) continue;

                // Check if token is a tag
                if (token.startsWith('<') && token.endsWith('>')) {
                    const isClosingTag = token.startsWith('</');
                    const isComment = token.startsWith('<!--');
                    const isSelfClosing = token.endsWith('/>');
                    const tagNameMatch = token.match(/<(?:\/)?([a-zA-Z0-9-]+)/);
                    const tagName = tagNameMatch ? tagNameMatch[1].toUpperCase() : '';
                    const isVoid = voidElements.includes(tagName);

                    if (isClosingTag) {
                        currentIndent = Math.max(0, currentIndent - 1);
                        resultLines.push(indentStr.repeat(currentIndent) + token);
                    } else if (isComment || isSelfClosing || isVoid) {
                        resultLines.push(indentStr.repeat(currentIndent) + token);
                    } else {
                        // Opening tag
                        resultLines.push(indentStr.repeat(currentIndent) + token);
                        currentIndent++;
                    }
                } else {
                    // Text node
                    resultLines.push(indentStr.repeat(currentIndent) + token);
                }
            }

            // Post-process: inline short text nodes inside single tags if desired, or return clean line-separated HTML
            return ConverterFormatter.cleanLineIndentation(resultLines, indentStr);
        },

        cleanLineIndentation: function(lines, indentStr) {
            // Merge single-line tags with simple text where appropriate (e.g. <h2>Heading</h2>)
            const merged = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const nextLine = lines[i + 1];
                const nextNextLine = lines[i + 2];

                if (line && nextLine && nextNextLine) {
                    const lineTrim = line.trim();
                    const nextTrim = nextLine.trim();
                    const nextNextTrim = nextNextLine.trim();

                    const openMatch = lineTrim.match(/^<([a-zA-Z0-9-]+)(?:\s+[^>]*)?>$/);
                    const closeMatch = nextNextTrim.match(/^<\/([a-zA-Z0-9-]+)>$/);

                    if (openMatch && closeMatch && openMatch[1] === closeMatch[1] && !nextTrim.startsWith('<')) {
                        const indent = line.substring(0, line.indexOf('<'));
                        merged.push(`${indent}${lineTrim}${nextTrim}${nextNextTrim}`);
                        i += 2;
                        continue;
                    }
                }
                merged.push(line);
            }
            return merged.join('\n');
        }
    };

    window.ConverterFormatter = ConverterFormatter;
})(window);
