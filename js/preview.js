/**
 * ConverterPreview - Handles iframe live preview, Prism syntax highlighting, copying, and file downloading.
 */
(function(window) {
    'use strict';

    const ConverterPreview = {
        updatePreviewFrame: function(iframeId, htmlContent) {
            const iframe = document.getElementById(iframeId);
            if (!iframe) return;

            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();

            // Construct full preview document with standard base styling
            const previewDoc = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Live Preview</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        body {
                            font-family: 'Inter', system-ui, -apple-system, sans-serif;
                            padding: 24px;
                            color: #212529;
                            background-color: #ffffff;
                            line-height: 1.6;
                        }
                        img { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
                </body>
                </html>
            `;

            iframeDoc.write(previewDoc);
            iframeDoc.close();
        },

        renderCodeOutput: function(codeElementId, htmlContent) {
            const codeEl = document.getElementById(codeElementId);
            if (!codeEl) return;

            const escapeHtml = (str) => {
                return str
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            };

            codeEl.innerHTML = escapeHtml(htmlContent);
            if (typeof Prism !== 'undefined') {
                Prism.highlightElement(codeEl);
            }
        },

        copyToClipboard: function(text, successCallback, errorCallback) {
            if (!text) {
                if (errorCallback) errorCallback('No content to copy.');
                return;
            }
            navigator.clipboard.writeText(text)
                .then(() => {
                    if (successCallback) successCallback();
                })
                .catch(err => {
                    if (errorCallback) errorCallback(err);
                });
        },

        downloadFile: function(content, filename = 'converted-output.html') {
            if (!content) return;
            const blob = new Blob([content], { type: 'text/html;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        }
    };

    window.ConverterPreview = ConverterPreview;
})(window);
