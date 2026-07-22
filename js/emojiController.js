/**
 * EmojiController - Coordinates the Emoji to Image Replacer tool UI.
 * Handles drag and drop of template files, image folder files, matching execution,
 * and copy/download output actions.
 */
$(document).ready(function() {
    'use strict';

    let loadedImageFilenames = [];

    // Fetch dynamic emoji database from CDN
    fetch('https://unpkg.com/unicode-emoji-json/data-by-emoji.json')
        .then(response => response.json())
        .then(data => {
            if (window.EmojiReplacer) {
                window.EmojiReplacer.setEmojiDatabase(data);
                console.log('Dynamic emoji database loaded successfully.');
            }
        })
        .catch(err => {
            console.warn('Failed to load dynamic emoji database from CDN. Using local fallbacks.', err);
        });

    // ==========================================================================
    // 1. Template File Loader
    // ==========================================================================
    $('#emojiTemplateFileInput').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            $('#emojiTemplateInput').val(evt.target.result);
        };
        reader.readAsText(file);
    });

    // ==========================================================================
    // 2. Drag & Drop for Icon Folder/Files
    // ==========================================================================
    const $emojiDropzone = $('#emojiDropzone');
    const $emojiImageFilesInput = $('#emojiImageFilesInput');

    $emojiDropzone.on('dragover dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $emojiDropzone.addClass('dragover');
    });

    $emojiDropzone.on('dragleave dragend drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $emojiDropzone.removeClass('dragover');
    });

    $emojiDropzone.on('drop', function(e) {
        const files = e.originalEvent.dataTransfer.files;
        if (files && files.length > 0) {
            processDroppedImages(Array.from(files));
        }
    });

    $emojiImageFilesInput.on('change', function(e) {
        const files = e.target.files;
        if (files && files.length > 0) {
            processDroppedImages(Array.from(files));
        }
    });

    function processDroppedImages(fileList) {
        // Retrieve base filenames with their extensions
        const newNames = fileList.map(f => f.name).filter(name => {
            const lower = name.toLowerCase();
            return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.gif') || lower.endsWith('.webp');
        });

        if (newNames.length === 0) {
            alert('No valid image files detected. Supported: png, jpg, jpeg, svg, gif, webp.');
            return;
        }

        // Add to existing list, clear duplicates and sort
        const currentNames = $('#emojiImageNamesTextarea').val()
            .split('\n')
            .map(n => n.trim())
            .filter(Boolean);

        const combined = Array.from(new Set([...currentNames, ...newNames])).sort();
        
        $('#emojiImageNamesTextarea').val(combined.join('\n'));
        loadedImageFilenames = combined;
    }

    // ==========================================================================
    // 3. Execution & Matching
    // ==========================================================================
    $('#replaceEmojiButton').on('click', function() {
        const rawCode = $('#emojiTemplateInput').val();
        if (!rawCode || !rawCode.trim()) {
            alert('Please paste or load template code containing emojis first.');
            return;
        }

        const imagePath = $('#emojiImagePathInput').val();
        const imageList = $('#emojiImageNamesTextarea').val()
            .split('\n')
            .map(n => n.trim())
            .filter(Boolean);

        if (imageList.length === 0) {
            if (!confirm('No available image filenames are listed. Emojis will be scanned but left unchanged. Do you want to continue?')) {
                return;
            }
        }

        const customMappings = $('#emojiCustomMappingsTextarea').val() || '';

        const imgConfig = {
            class: $('#emojiImgClassInput').val() ? $('#emojiImgClassInput').val().trim() : '',
            width: $('#emojiImgWidthInput').val() ? $('#emojiImgWidthInput').val().trim() : '',
            height: $('#emojiImgHeightInput').val() ? $('#emojiImgHeightInput').val().trim() : '',
            attrs: $('#emojiImgAttrsInput').val() ? $('#emojiImgAttrsInput').val().trim() : ''
        };

        // Execute replacements
        const result = window.EmojiReplacer.replace(rawCode, imagePath, imageList, customMappings, imgConfig);

        // Render Metrics Summary Bar
        if (result.metrics) {
            $('#metricTotal').text(result.metrics.total);
            $('#metricReplaced').text(result.metrics.replaced);
            $('#metricMissing').text(result.metrics.missing);
            $('#metricAccuracy').text(result.metrics.accuracy + '%');
            $('#emojiMetricsBar').removeClass('d-none');
            
            // Update sub-tab badges
            $('#replacedCountBadge').text(result.metrics.replaced);
            $('#missingCountBadge').text(result.metrics.missing);
        } else {
            $('#emojiMetricsBar').addClass('d-none');
        }

        // Render processed output code
        const $codeContainer = $('#emojiOutputCode');
        const escapeHtml = (str) => {
            return str
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        $codeContainer.html(escapeHtml(result.processedCode));
        if (typeof Prism !== 'undefined') {
            Prism.highlightElement($codeContainer[0]);
        }

        // Render Logs tables (Replaced vs Missing)
        const $replacedTableBody = $('#replacedLogTableBody');
        const $missingTableBody = $('#missingLogTableBody');
        
        $replacedTableBody.empty();
        $missingTableBody.empty();

        const successLogs = result.logs.filter(l => l.status === 'Success');
        const omittedLogs = result.logs.filter(l => l.status === 'Omitted');

        // Render Replaced Emojis Table
        if (successLogs.length === 0) {
            $replacedTableBody.append(`
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted fst-italic">No emojis were replaced.</td>
                </tr>
            `);
        } else {
            successLogs.forEach(log => {
                const rowHtml = `
                    <tr>
                        <td class="text-center fw-bold fs-5">${log.emoji}</td>
                        <td class="font-monospace text-muted extra-small">${log.context}</td>
                        <td class="fw-semibold text-success font-monospace">${log.image}</td>
                        <td class="font-monospace text-secondary extra-small">${escapeHtml(log.tag)}</td>
                        <td><small class="text-muted">${log.method}</small></td>
                    </tr>
                `;
                $replacedTableBody.append(rowHtml);
            });
        }

        // Render Missing Emojis Table
        if (omittedLogs.length === 0) {
            $missingTableBody.append(`
                <tr>
                    <td colspan="3" class="text-center py-4 text-muted fst-italic">No missing emojis! Accuracy is at 100%.</td>
                </tr>
            `);
        } else {
            omittedLogs.forEach(log => {
                const rowHtml = `
                    <tr>
                        <td class="text-center fw-bold fs-5 text-danger">${log.emoji}</td>
                        <td class="font-monospace text-muted extra-small">${log.context}</td>
                        <td><span class="badge bg-warning-subtle text-warning-emphasis rounded-pill font-monospace">${log.method}</span></td>
                    </tr>
                `;
                $missingTableBody.append(rowHtml);
            });
        }

        // Automatically switch subtabs to show output
        $('#emoji-result-tab').tab('show');
    });

    // ==========================================================================
    // 4. Output Actions (Copy & Download)
    // ==========================================================================
    
    // Copy code
    $('#copyEmojiOutputBtn').on('click', function() {
        const text = $('#emojiOutputCode').text();
        if (!text || text === '<!-- Processed output will display here -->') {
            alert('No processed output available to copy.');
            return;
        }

        window.ConverterPreview.copyToClipboard(
            text,
            function() {
                const $btn = $('#copyEmojiOutputBtn');
                const originalHtml = $btn.html();
                $btn.html('<i class="bi bi-check-lg"></i> <span>Copied!</span>');
                $btn.removeClass('btn-dark').addClass('btn-success');
                setTimeout(() => {
                    $btn.html(originalHtml);
                    $btn.removeClass('btn-success').addClass('btn-dark');
                }, 2000);
            },
            function() {
                alert('Failed to copy code to clipboard.');
            }
        );
    });

    // Download code file
    $('#downloadEmojiOutputBtn').on('click', function() {
        const text = $('#emojiOutputCode').text();
        if (!text || text === '<!-- Processed output will display here -->') {
            alert('No processed output available to download.');
            return;
        }

        // Try to guess extension based on loaded template file or default to html
        let filename = 'processed-template.html';
        const fileInput = document.getElementById('emojiTemplateFileInput');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const origName = fileInput.files[0].name;
            const extMatch = origName.match(/\.([a-zA-Z0-9]+)$/);
            if (extMatch) {
                filename = 'processed_' + origName;
            }
        }

        window.ConverterPreview.downloadFile(text, filename);
    });
});
