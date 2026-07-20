/**
 * Word to HTML Converter - Main Application Controller
 * Supports multi-file batch conversion, Per-File Hyperlinks Modal, Delimiters (>>, ||, :), and JSZip bundling.
 */

$(document).ready(function() {
    'use strict';

    let uploadedFiles = []; // Array of { file, name, bulkLinksText, caseSensitive, boldOnly, parsedRules, formattedHtml }
    let activeFileIndex = 0;
    let editingFileIdx = null;

    // Helper: Parse Bulk Links Text (supports >>, ||, :)
    function parseBulkLinksText(text, defaultCaseSensitive = false, defaultBoldOnly = true) {
        if (!text || !text.trim()) return [];
        const lines = text.split('\n');
        const rules = [];

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            let target = '';
            let url = '';

            if (trimmed.includes('>>')) {
                const parts = trimmed.split('>>');
                target = parts[0].trim();
                url = parts.slice(1).join('>>').trim();
            } else if (trimmed.includes('||')) {
                const parts = trimmed.split('||');
                target = parts[0].trim();
                url = parts.slice(1).join('||').trim();
            } else if (trimmed.includes(':')) {
                const parts = trimmed.split(':');
                target = parts[0].trim();
                url = parts.slice(1).join(':').trim();
            }

            if (target && url) {
                rules.push({
                    id: 'bulk_' + idx + '_' + Date.now(),
                    target: target,
                    url: url,
                    targetAttr: '_blank',
                    title: '',
                    rel: '',
                    caseSensitive: defaultCaseSensitive,
                    boldOnly: defaultBoldOnly
                });
            }
        });

        return rules;
    }

    // Initialize configuration from LocalStorage if available
    const savedConfig = window.ConverterStorage ? window.ConverterStorage.load() : null;
    if (savedConfig) {
        window.ConverterConfig.set(savedConfig);
        logSystemEvent('Loaded saved configuration from LocalStorage.');
    } else {
        logSystemEvent('Initialized with default configuration.');
    }

    // Populate all UI fields from active ConverterConfig
    populateUIFromConfig();

    // ==========================================================================
    // UI Form Binding & Synchronization
    // ==========================================================================

    function populateUIFromConfig() {
        const cfg = window.ConverterConfig.get();

        // 1. Wrapper
        if (cfg.wrapper) {
            $(`input[name="wrapperMode"][value="${cfg.wrapper.mode || 'repeat'}"]`).prop('checked', true);
            $('#cfgWrapperTag').val(cfg.wrapper.tag || 'div');
            $('#cfgWrapperClass').val(cfg.wrapper.class || '');
            $('#cfgWrapperId').val(cfg.wrapper.id || '');
            $('#cfgWrapperAttrs').val(cfg.wrapper.attrs || '');
        }

        // 2. Headings
        if (cfg.headings) {
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(h => {
                const hKey = h.toUpperCase();
                if (cfg.headings[h]) {
                    $(`#cfg${hKey}Tag`).val(cfg.headings[h].tag || '');
                    $(`#cfg${hKey}Class`).val(cfg.headings[h].class || '');
                }
            });
        }

        // 3. Paragraph
        if (cfg.paragraph) {
            $('#cfgParagraphTag').val(cfg.paragraph.tag || 'p');
            $('#cfgParagraphClass').val(cfg.paragraph.class || '');
        }

        // 4. Lists
        if (cfg.list) {
            if (cfg.list.ul) {
                $('#cfgUlTag').val(cfg.list.ul.tag || 'ul');
                $('#cfgUlClass').val(cfg.list.ul.class || '');
            }
            if (cfg.list.ol) {
                $('#cfgOlTag').val(cfg.list.ol.tag || 'ol');
                $('#cfgOlClass').val(cfg.list.ol.class || '');
            }
            if (cfg.list.li) {
                $('#cfgLiTag').val(cfg.list.li.tag || 'li');
                $('#cfgLiClass').val(cfg.list.li.class || '');
            }
        }

        // 5. Tables
        if (cfg.table) {
            ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'].forEach(elKey => {
                const elRule = cfg.table[elKey];
                if (elRule) {
                    const capKey = elKey.charAt(0).toUpperCase() + elKey.slice(1);
                    $(`#cfg${capKey}Tag`).val(elRule.tag || '');
                    $(`#cfg${capKey}Class`).val(elRule.class || '');
                    $(`#cfg${capKey}Attrs`).val(elRule.attrs || '');
                    if (elKey === 'th' || elKey === 'td') {
                        $(`#cfg${capKey}InnerTag`).val(elRule.innerTag || '');
                        $(`#cfg${capKey}InnerClass`).val(elRule.innerClass || '');
                    }
                }
            });

            if (cfg.table && cfg.table.wrapper) {
                $('#cfgTableWrapperTag').val(cfg.table.wrapper.tag || '');
                $('#cfgTableWrapperClass').val(cfg.table.wrapper.class || '');
                $('#cfgTableWrapperAttrs').val(cfg.table.wrapper.attrs || '');
            }
        }

        // 6. Image
        if (cfg.image) {
            $('#cfgImgClass').val(cfg.image.class || '');
            $('#cfgImgLoading').val(cfg.image.loading || '');
            $('#cfgImgDecoding').val(cfg.image.decoding || '');
            $('#cfgImgAlt').val(cfg.image.alt || '');
            $('#cfgImgWidth').val(cfg.image.width || '');
            $('#cfgImgHeight').val(cfg.image.height || '');
            $('#cfgImgWrapperTag').val(cfg.image.wrapperTag || '');
            $('#cfgImgWrapperClass').val(cfg.image.wrapperClass || '');
        }

        // 7. Custom Start / End Code
        $('#cfgStartCode').val(cfg.startCode || '');
        $('#cfgEndCode').val(cfg.endCode || '');

        // 8. Global Hyperlink Rules
        renderLinkRules();
    }

    function syncUItoConfig() {
        const cfg = window.ConverterConfig.get();

        // 1. Wrapper
        cfg.wrapper.mode = $('input[name="wrapperMode"]:checked').val() || 'repeat';
        cfg.wrapper.tag = $('#cfgWrapperTag').val().trim();
        cfg.wrapper.class = $('#cfgWrapperClass').val().trim();
        cfg.wrapper.id = $('#cfgWrapperId').val().trim();
        cfg.wrapper.attrs = $('#cfgWrapperAttrs').val().trim();

        // 2. Headings
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(h => {
            const hKey = h.toUpperCase();
            cfg.headings[h] = {
                tag: $(`#cfg${hKey}Tag`).val().trim(),
                class: $(`#cfg${hKey}Class`).val().trim()
            };
        });

        // 3. Paragraph
        cfg.paragraph = {
            tag: $('#cfgParagraphTag').val().trim(),
            class: $('#cfgParagraphClass').val().trim()
        };

        // 4. Lists
        cfg.list = {
            ul: { tag: $('#cfgUlTag').val().trim(), class: $('#cfgUlClass').val().trim() },
            ol: { tag: $('#cfgOlTag').val().trim(), class: $('#cfgOlClass').val().trim() },
            li: { tag: $('#cfgLiTag').val().trim(), class: $('#cfgLiClass').val().trim() }
        };

        // 5. Tables
        cfg.table = {
            wrapper: {
                tag: $('#cfgTableWrapperTag').val().trim(),
                class: $('#cfgTableWrapperClass').val().trim(),
                attrs: $('#cfgTableWrapperAttrs').val().trim()
            },
            table: { tag: $('#cfgTableTag').val().trim(), class: $('#cfgTableClass').val().trim(), attrs: $('#cfgTableAttrs').val().trim() },
            thead: { tag: $('#cfgTheadTag').val().trim(), class: $('#cfgTheadClass').val().trim(), attrs: $('#cfgTheadAttrs').val().trim() },
            tbody: { tag: $('#cfgTbodyTag').val().trim(), class: $('#cfgTbodyClass').val().trim(), attrs: $('#cfgTbodyAttrs').val().trim() },
            tfoot: { tag: $('#cfgTfootTag').val().trim(), class: $('#cfgTfootClass').val().trim(), attrs: $('#cfgTfootAttrs').val().trim() },
            tr: { tag: $('#cfgTrTag').val().trim(), class: $('#cfgTrClass').val().trim(), attrs: $('#cfgTrAttrs').val().trim() },
            th: { 
                tag: $('#cfgThTag').val().trim(), 
                class: $('#cfgThClass').val().trim(), 
                attrs: $('#cfgThAttrs').val().trim(),
                innerTag: $('#cfgThInnerTag').val().trim(),
                innerClass: $('#cfgThInnerClass').val().trim()
            },
            td: { 
                tag: $('#cfgTdTag').val().trim(), 
                class: $('#cfgTdClass').val().trim(), 
                attrs: $('#cfgTdAttrs').val().trim(),
                innerTag: $('#cfgTdInnerTag').val().trim(),
                innerClass: $('#cfgTdInnerClass').val().trim()
            }
        };

        // 6. Image
        cfg.image = {
            class: $('#cfgImgClass').val().trim(),
            loading: $('#cfgImgLoading').val(),
            decoding: $('#cfgImgDecoding').val(),
            alt: $('#cfgImgAlt').val().trim(),
            width: $('#cfgImgWidth').val().trim(),
            height: $('#cfgImgHeight').val().trim(),
            wrapperTag: $('#cfgImgWrapperTag').val().trim(),
            wrapperClass: $('#cfgImgWrapperClass').val().trim()
        };

        // 7. Custom Start / End Code
        cfg.startCode = $('#cfgStartCode').val();
        cfg.endCode = $('#cfgEndCode').val();

        // 8. Global Hyperlink Rules (Global Bulk Textarea + Single Card Rules)
        cfg.links = [];

        const bulkText = $('#cfgBulkLinks').val() || '';
        const bulkCaseSensitive = $('#cfgBulkCaseSensitive').is(':checked');
        const bulkBoldOnly = $('#cfgBulkBoldOnly').is(':checked');
        cfg.links.push(...parseBulkLinksText(bulkText, bulkCaseSensitive, bulkBoldOnly));

        $('.link-rule-card').each(function() {
            const $card = $(this);
            const target = $card.find('.link-target').val().trim();
            const url = $card.find('.link-url').val().trim();
            if (target && url) {
                cfg.links.push({
                    id: $card.data('id'),
                    target: target,
                    url: url,
                    targetAttr: $card.find('.link-targetattr').val(),
                    title: $card.find('.link-title').val().trim(),
                    rel: '',
                    caseSensitive: $card.find('.link-casesensitive').is(':checked'),
                    boldOnly: $card.find('.link-boldonly').is(':checked')
                });
            }
        });

        // Auto save to LocalStorage
        window.ConverterStorage.save(cfg);
    }

    // Attach change/input listeners to all config inputs
    $(document).on('input change', '#configAccordion input, #configAccordion select, #configAccordion textarea', function() {
        syncUItoConfig();
    });

    // ==========================================================================
    // Dynamic Hyperlink Rules Manager UI
    // ==========================================================================

    function renderLinkRules() {
        const $container = $('#linkRulesContainer');
        $container.empty();

        const cfg = window.ConverterConfig.get();
        const rules = (cfg.links || []).filter(r => !String(r.id).startsWith('bulk_'));

        if (rules.length === 0) {
            $container.append('<p class="text-muted small mb-0 fst-italic">No single rule cards added yet. Use "+ Add Rule Card" or paste bulk links above.</p>');
            return;
        }

        rules.forEach((rule, idx) => {
            const cardHtml = `
                <div class="link-rule-card border rounded-3 p-3 bg-white mb-2" data-id="${rule.id || idx}">
                    <div class="row g-2 align-items-center">
                        <div class="col-md-3">
                            <label class="form-label small text-muted mb-1">Target Text</label>
                            <input type="text" class="form-control form-control-sm link-target" value="${rule.target || ''}" placeholder="e.g. Aryan Barot">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small text-muted mb-1">URL</label>
                            <input type="text" class="form-control form-control-sm link-url" value="${rule.url || ''}" placeholder="e.g. mypage.php">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small text-muted mb-1">Open In</label>
                            <select class="form-select form-select-sm link-targetattr">
                                <option value="_blank" ${rule.targetAttr === '_blank' ? 'selected' : ''}>_blank</option>
                                <option value="_self" ${rule.targetAttr === '_self' ? 'selected' : ''}>_self</option>
                                <option value="" ${!rule.targetAttr ? 'selected' : ''}>(none)</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small text-muted mb-1">Title</label>
                            <input type="text" class="form-control form-control-sm link-title" value="${rule.title || ''}" placeholder="Title">
                        </div>
                        <div class="col-md-2 text-end">
                            <button type="button" class="btn btn-sm btn-outline-danger delete-link-btn mt-4" title="Delete Rule">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <div class="col-12 d-flex gap-4 pt-1">
                            <div class="form-check">
                                <input class="form-check-input link-casesensitive" type="checkbox" id="chkCase_${idx}" ${rule.caseSensitive ? 'checked' : ''}>
                                <label class="form-check-label small" for="chkCase_${idx}">Case Sensitive</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input link-boldonly" type="checkbox" id="chkBold_${idx}" ${rule.boldOnly ? 'checked' : ''}>
                                <label class="form-check-label small" for="chkBold_${idx}">Match Bold Only</label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $container.append(cardHtml);
        });
    }

    $('#addLinkRuleBtn').on('click', function() {
        const cfg = window.ConverterConfig.get();
        if (!cfg.links) cfg.links = [];
        cfg.links.push({
            id: 'link_' + Date.now(),
            target: '',
            url: '',
            targetAttr: '_blank',
            title: '',
            rel: '',
            caseSensitive: false,
            boldOnly: true
        });
        window.ConverterStorage.save(cfg);
        renderLinkRules();
        logSystemEvent('Added new Hyperlink Rule Card.');
    });

    $(document).on('input change', '.link-rule-card input, .link-rule-card select', function() {
        syncUItoConfig();
    });

    $(document).on('click', '.delete-link-btn', function() {
        const $card = $(this).closest('.link-rule-card');
        const ruleId = $card.data('id');
        const cfg = window.ConverterConfig.get();

        cfg.links = (cfg.links || []).filter(r => r.id !== ruleId && r.id != ruleId);
        window.ConverterStorage.save(cfg);
        renderLinkRules();
        logSystemEvent('Removed Hyperlink Rule.');
    });

    // ==========================================================================
    // Export, Import & Reset Configuration Actions
    // ==========================================================================

    $('#exportSettingsBtn').on('click', function() {
        syncUItoConfig();
        const cfg = window.ConverterConfig.get();
        window.ConverterStorage.exportToFile(cfg, 'settings.json');
        logSystemEvent('Exported configuration to settings.json.', 'success');
    });

    $('#importSettingsFile').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        window.ConverterStorage.importFromFile(file, function(err, importedConfig) {
            if (err || !importedConfig) {
                alert('Invalid settings JSON file.');
                logSystemEvent('Failed to import configuration: Invalid JSON.', 'warning');
                return;
            }

            window.ConverterConfig.set(importedConfig);
            window.ConverterStorage.save(importedConfig);
            populateUIFromConfig();
            logSystemEvent(`Successfully imported configuration from "${file.name}".`, 'success');
            $('#importSettingsFile').val('');
        });
    });

    $('#resetSettingsBtn').on('click', function() {
        if (confirm('Are you sure you want to reset all configurations to default settings?')) {
            window.ConverterConfig.reset();
            window.ConverterStorage.clear();
            $('#cfgBulkLinks').val('');
            populateUIFromConfig();
            logSystemEvent('Reset configuration to default settings.', 'info');
        }
    });

    // ==========================================================================
    // Multi-File Upload & Per-File Hyperlinks Modal Events
    // ==========================================================================

    const $dropzone = $('#dropzone');
    const $wordFileInput = $('#wordFileInput');

    $dropzone.on('dragover dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $dropzone.addClass('dragover');
    });

    $dropzone.on('dragleave dragend drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $dropzone.removeClass('dragover');
    });

    $dropzone.on('drop', function(e) {
        const files = e.originalEvent.dataTransfer.files;
        if (files && files.length > 0) handleSelectedFiles(Array.from(files));
    });

    $wordFileInput.on('change', function(e) {
        const files = e.target.files;
        if (files && files.length > 0) handleSelectedFiles(Array.from(files));
    });

    function handleSelectedFiles(fileList) {
        const docxFiles = fileList.filter(f => f.name.toLowerCase().endsWith('.docx'));
        if (docxFiles.length === 0) {
            alert('Please select valid Microsoft Word document (.docx) files.');
            logSystemEvent('Error: Selected files contain no .docx documents.', 'warning');
            return;
        }

        uploadedFiles = docxFiles.map(f => ({
            file: f,
            name: f.name,
            bulkLinksText: '',
            caseSensitive: false,
            boldOnly: true,
            parsedRules: [],
            formattedHtml: ''
        }));
        activeFileIndex = 0;

        renderUploadedFileBadges();
        logSystemEvent(`Selected ${uploadedFiles.length} Word document(s) for batch conversion.`);
    }

    function renderUploadedFileBadges() {
        const $badges = $('#fileBadgesContainer');
        $badges.empty();

        if (uploadedFiles.length === 0) {
            $('#fileInfoContainer').removeClass('d-flex').addClass('d-none');
            return;
        }

        $('#uploadedFilesSummary').text(`Uploaded Files (${uploadedFiles.length})`);
        $('#fileInfoContainer').removeClass('d-none').addClass('d-flex');

        uploadedFiles.forEach((item, idx) => {
            const count = item.parsedRules ? item.parsedRules.length : 0;
            const badgeHtml = `
                <div class="file-item-card d-flex align-items-center justify-content-between p-2 mb-2 bg-white border rounded-3 w-100 shadow-xs">
                    <div class="d-flex align-items-center gap-2 overflow-hidden me-2">
                        <i class="bi bi-file-earmark-word-fill text-primary fs-5 flex-shrink-0"></i>
                        <div>
                            <div class="fw-semibold small text-body text-truncate" style="max-width: 260px;" title="${item.name}">${item.name}</div>
                            <div class="text-muted extra-small">${(item.file.size / 1024).toFixed(1)} KB</div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <button type="button" class="btn btn-sm ${count > 0 ? 'btn-primary' : 'btn-outline-primary'} open-file-links-btn d-flex align-items-center gap-1 py-1 px-2" data-idx="${idx}">
                            <i class="bi bi-link-45deg"></i>
                            <span>Hyperlinks</span>
                            <span class="badge ${count > 0 ? 'bg-white text-primary' : 'bg-primary text-white'} rounded-pill ms-1">${count}</span>
                        </button>
                        <button type="button" class="btn-close remove-single-file" data-idx="${idx}" aria-label="Remove"></button>
                    </div>
                </div>
            `;
            $badges.append(badgeHtml);
        });
    }

    // Open Dedicated Per-File Links Modal
    $(document).on('click', '.open-file-links-btn', function(e) {
        e.stopPropagation();
        editingFileIdx = $(this).data('idx');
        const item = uploadedFiles[editingFileIdx];
        if (!item) return;

        $('#modalFileName').text(item.name);
        $('#modalBulkLinksTextarea').val(item.bulkLinksText || '');
        $('#modalCaseSensitive').prop('checked', !!item.caseSensitive);
        $('#modalBoldOnly').prop('checked', item.boldOnly !== undefined ? !!item.boldOnly : true);

        const fileModal = bootstrap.Modal.getOrCreateInstance('#fileLinksModal');
        fileModal.show();
    });

    // Save Dedicated Per-File Links
    $('#saveFileLinksBtn').on('click', function() {
        if (editingFileIdx === null || !uploadedFiles[editingFileIdx]) return;
        const item = uploadedFiles[editingFileIdx];

        item.bulkLinksText = $('#modalBulkLinksTextarea').val() || '';
        item.caseSensitive = $('#modalCaseSensitive').is(':checked');
        item.boldOnly = $('#modalBoldOnly').is(':checked');

        // Parse per-file bulk links text (supports >>, ||, :)
        item.parsedRules = parseBulkLinksText(item.bulkLinksText, item.caseSensitive, item.boldOnly);

        renderUploadedFileBadges();
        logSystemEvent(`Updated ${item.parsedRules.length} hyperlink rule(s) for "${item.name}".`, 'success');

        const fileModal = bootstrap.Modal.getInstance('#fileLinksModal');
        if (fileModal) fileModal.hide();
    });

    $(document).on('click', '.remove-single-file', function(e) {
        e.stopPropagation();
        const idx = $(this).data('idx');
        uploadedFiles.splice(idx, 1);
        if (activeFileIndex >= uploadedFiles.length) {
            activeFileIndex = Math.max(0, uploadedFiles.length - 1);
        }
        renderUploadedFileBadges();
        if (uploadedFiles.length === 0) {
            clearOutputs();
        }
    });

    $('#clearFileButton').on('click', function() {
        uploadedFiles = [];
        activeFileIndex = 0;
        $wordFileInput.val('');
        renderUploadedFileBadges();
        clearOutputs();
        logSystemEvent('Cleared all uploaded files.');
    });

    function clearOutputs() {
        $('#htmlOutputCode').text('<!-- Converted output will display here -->');
        if (typeof Prism !== 'undefined') {
            Prism.highlightElement(document.getElementById('htmlOutputCode'));
        }

        const iframe = document.getElementById('previewIframe');
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write('');
        iframeDoc.close();
        $('#previewEmptyState').removeClass('d-none').addClass('d-flex');

        $('#convertedFileSelect').addClass('d-none').empty();
        $('#downloadZipButton').addClass('d-none');
        $('#activeFilenameLabel').text('output.html');
    }

    // ==========================================================================
    // Document Batch Conversion Execution
    // ==========================================================================

    $('#convertButton').on('click', function() {
        if (!uploadedFiles || uploadedFiles.length === 0) {
            alert('Please upload at least one Microsoft Word document (.docx).');
            return;
        }

        syncUItoConfig();
        const activeConfig = window.ConverterConfig.get();
        logSystemEvent(`Starting batch conversion for ${uploadedFiles.length} document(s)...`, 'info');

        let completedCount = 0;

        uploadedFiles.forEach((fileItem) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;

                window.ConverterParser.parseDocument(arrayBuffer, {}, function(err, result) {
                    if (err) {
                        console.error(err);
                        logSystemEvent(`Failed converting "${fileItem.name}": ${err.message}`, 'warning');
                        completedCount++;
                        return;
                    }

                    // Create file-specific configuration by combining Global Links + File Specific Links
                    const fileConfig = JSON.parse(JSON.stringify(activeConfig));
                    fileConfig.links = [
                        ...(activeConfig.links || []),
                        ...(fileItem.parsedRules || [])
                    ];

                    // Generate HTML according to configuration
                    const rawGenerated = window.ConverterGenerator.generate(result.domTree, fileConfig);

                    // Format generated HTML cleanly
                    fileItem.formattedHtml = window.ConverterFormatter.formatHtml(rawGenerated, 4);
                    completedCount++;

                    logSystemEvent(`Finished converting "${fileItem.name}".`, 'success');

                    if (completedCount === uploadedFiles.length) {
                        onBatchConversionComplete();
                    }
                });
            };
            reader.readAsArrayBuffer(fileItem.file);
        });
    });

    function onBatchConversionComplete() {
        logSystemEvent(`Batch conversion completed successfully! (${uploadedFiles.length} file(s) ready).`, 'success');

        // Setup File Selector Dropdown if multiple files exist
        const $fileSelect = $('#convertedFileSelect');
        $fileSelect.empty();

        if (uploadedFiles.length > 1) {
            uploadedFiles.forEach((item, idx) => {
                const outName = item.name.replace(/\.docx$/i, '.html');
                $fileSelect.append(`<option value="${idx}">${outName}</option>`);
            });
            $fileSelect.removeClass('d-none');
            $('#downloadZipButton').removeClass('d-none');
        } else {
            $fileSelect.addClass('d-none');
            $('#downloadZipButton').addClass('d-none');
        }

        activeFileIndex = 0;
        updateActiveFileView();

        $('#previewEmptyState').addClass('d-none').removeClass('d-flex');
        $('#preview-tab').tab('show');
    }

    function updateActiveFileView() {
        const currentItem = uploadedFiles[activeFileIndex];
        if (!currentItem || !currentItem.formattedHtml) return;

        const outName = currentItem.name.replace(/\.docx$/i, '.html');
        $('#activeFilenameLabel').text(outName);
        $('#convertedFileSelect').val(activeFileIndex);

        window.ConverterPreview.updatePreviewFrame('previewIframe', currentItem.formattedHtml);
        window.ConverterPreview.renderCodeOutput('htmlOutputCode', currentItem.formattedHtml);
    }

    $('#convertedFileSelect').on('change', function() {
        activeFileIndex = parseInt($(this).val(), 10) || 0;
        updateActiveFileView();
    });

    // Refresh Live Preview
    $('#refreshPreview').on('click', function() {
        updateActiveFileView();
        logSystemEvent('Refreshed iframe preview.');
    });

    // Copy Current HTML to Clipboard
    $('#copyHtmlButton').on('click', function() {
        const currentItem = uploadedFiles[activeFileIndex];
        if (!currentItem || !currentItem.formattedHtml) {
            alert('No converted HTML available to copy. Please run conversion.');
            return;
        }

        window.ConverterPreview.copyToClipboard(
            currentItem.formattedHtml,
            function() {
                const $btn = $('#copyHtmlButton');
                const originalHtml = $btn.html();
                $btn.html('<i class="bi bi-check-lg"></i> <span>Copied!</span>');
                $btn.removeClass('btn-dark').addClass('btn-success');
                logSystemEvent('Copied active HTML to clipboard.');
                setTimeout(() => {
                    $btn.html(originalHtml);
                    $btn.removeClass('btn-success').addClass('btn-dark');
                }, 2000);
            },
            function(err) {
                alert('Failed to copy HTML to clipboard.');
            }
        );
    });

    // Download Single HTML File
    $('#downloadHtmlButton').on('click', function() {
        const currentItem = uploadedFiles[activeFileIndex];
        if (!currentItem || !currentItem.formattedHtml) {
            alert('No converted HTML available to download. Please run conversion.');
            return;
        }

        const filename = currentItem.name.replace(/\.docx$/i, '.html');
        window.ConverterPreview.downloadFile(currentItem.formattedHtml, filename);
        logSystemEvent(`Downloaded output file: "${filename}".`);
    });

    // Download All Converted Files as ZIP
    $('#downloadZipButton').on('click', function() {
        if (!uploadedFiles || uploadedFiles.length === 0) {
            alert('No converted files available to bundle in ZIP.');
            return;
        }

        if (typeof JSZip === 'undefined') {
            alert('JSZip library is missing.');
            return;
        }

        const zip = new JSZip();
        uploadedFiles.forEach(item => {
            if (item.formattedHtml) {
                const outName = item.name.replace(/\.docx$/i, '.html');
                zip.file(outName, item.formattedHtml);
            }
        });

        zip.generateAsync({ type: 'blob' }).then(function(content) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = 'converted_html_files.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            logSystemEvent(`Downloaded ${uploadedFiles.length} files as "converted_html_files.zip".`, 'success');
        });
    });

    // ==========================================================================
    // Console Logs and Event Tracing
    // ==========================================================================

    function logSystemEvent(msg, type = 'system') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `<div class="log-entry log-${type}">[${timestamp}] ${msg}</div>`;
        const $logs = $('#logsContainer');
        $logs.append(entry);
        $logs.scrollTop($logs[0].scrollHeight);
    }

    $('#clearLogsButton').on('click', function() {
        $('#logsContainer').empty();
        logSystemEvent('Console cleared.');
    });

    // ==========================================================================
    // Theme Switcher Layout Control
    // ==========================================================================

    const $themeToggle = $('#themeToggle');
    let savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    $themeToggle.on('click', function() {
        savedTheme = savedTheme === 'light' ? 'dark' : 'light';
        setTheme(savedTheme);
    });

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        if (theme === 'dark') {
            $themeToggle.html('<i class="bi bi-sun-fill text-warning me-1"></i> Light Mode');
            $themeToggle.removeClass('btn-outline-dark').addClass('btn-outline-light');
        } else {
            $themeToggle.html('<i class="bi bi-moon-fill text-dark me-1"></i> Dark Mode');
            $themeToggle.removeClass('btn-outline-light').addClass('btn-outline-dark');
        }
    }
});
