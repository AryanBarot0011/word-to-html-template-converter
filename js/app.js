/**
 * Word to HTML Template Converter - Application Controller
 */

$(document).ready(function() {
    // ==========================================================================
    // State Initialization
    // ==========================================================================
    
    // Default HTML Template Blocks preloaded with custom card styles
    let blocks = [
        {
            id: 'block_1',
            name: 'Content Section',
            type: 'content',
            template: `<div class="blog-info-details">
    <h2>{{heading}}</h2>
    <p>{{paragraph}}</p>
</div>`,
            isCollapsed: false
        },
        {
            id: 'block_2',
            name: 'List Section (With Text)',
            type: 'list',
            template: `<div class="blog-info-details">
    <h2>{{heading}}</h2>
    <p>{{paragraph}}</p>
    <ul>
        <li>{{list}}</li>
    </ul>
</div>`,
            isCollapsed: false
        },
        {
            id: 'block_3',
            name: 'List Section (No Text)',
            type: 'list',
            template: `<div class="blog-info-details">
    <h2>{{heading}}</h2>
    <ul>
        <li>{{list}}</li>
    </ul>
</div>`,
            isCollapsed: false
        },
        {
            id: 'block_4',
            name: 'Table Section',
            type: 'table',
            template: `<div class="blog-info-details">
    <h2>{{heading}}</h2>
    <div class="table-responsive my-3">
        <table class="table table-bordered align-middle">
            {{table}}
        </table>
    </div>
</div>`,
            isCollapsed: false
        },
        {
            id: 'block_5',
            name: 'Image Section',
            type: 'image',
            template: `<div class="blog-info-details">
    <h2>{{heading}}</h2>
    <div class="image-wrapper text-center my-4">
        {{image}}
    </div>
</div>`,
            isCollapsed: false
        }
    ];

    let currentFile = null;
    let convertedHtml = '';
    
    // Global Settings state
    let settings = {
        wrapper: 'none',
        cleanEmptyParagraphs: true,
        cleanWordClasses: true,
        cleanInlineStyles: true,
        styleMap: ''
    };

    // ==========================================================================
    // UI Render: HTML Structure Builder Blocks
    // ==========================================================================
    
    function renderBlocks() {
        const $list = $('#blocksList');
        $list.empty();
        
        blocks.forEach((block, index) => {
            let placeholderHint = '';
            if (block.type === 'content') placeholderHint = '{{heading}}, {{paragraph}}';
            else if (block.type === 'table') placeholderHint = '{{table}}';
            else if (block.type === 'list') placeholderHint = '{{list}}';
            else if (block.type === 'image') placeholderHint = '{{image}}';
            
            const blockEl = `
                <div class="structure-block ${block.isCollapsed ? 'collapsed' : ''}" data-id="${block.id}">
                    <!-- Block Header -->
                    <div class="structure-block-header d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center gap-2 flex-grow-1 me-2 overflow-hidden">
                            <span class="block-drag-handle text-muted" title="Drag structure"><i class="bi bi-justify"></i></span>
                            
                            <!-- Up & Down Arrows for reordering -->
                            <div class="d-flex flex-column btn-group-vertical">
                                <button type="button" class="btn p-0 lh-1 move-up-btn" style="font-size: 10px;" title="Move Up" ${index === 0 ? 'disabled' : ''}>
                                    <i class="bi bi-caret-up-fill"></i>
                                </button>
                                <button type="button" class="btn p-0 lh-1 move-down-btn" style="font-size: 10px;" title="Move Down" ${index === blocks.length - 1 ? 'disabled' : ''}>
                                    <i class="bi bi-caret-down-fill"></i>
                                </button>
                            </div>
                            
                            <!-- Editable Block Name -->
                            <input type="text" class="form-control form-control-sm fw-semibold border-0 bg-transparent block-name-input text-dark" value="${block.name}" placeholder="Structure Name" style="max-width: 150px;">
                            
                            <!-- Match Target selector -->
                            <select class="form-select form-select-sm border-0 bg-transparent block-type-select text-primary" style="max-width: 140px; font-size: 12px; font-weight: 500;">
                                <option value="content" ${block.type === 'content' ? 'selected' : ''}>Match: Content</option>
                                <option value="table" ${block.type === 'table' ? 'selected' : ''}>Match: Table</option>
                                <option value="list" ${block.type === 'list' ? 'selected' : ''}>Match: List</option>
                                <option value="image" ${block.type === 'image' ? 'selected' : ''}>Match: Image</option>
                            </select>
                        </div>
                        
                        <!-- Block Action buttons -->
                        <div class="d-flex align-items-center gap-1">
                            <button type="button" class="btn btn-sm btn-icon btn-light rounded-circle duplicate-block-btn" title="Duplicate Structure">
                                <i class="bi bi-copy text-muted"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-icon btn-light rounded-circle delete-block-btn" title="Delete Structure">
                                <i class="bi bi-trash text-danger"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-icon btn-light rounded-circle toggle-collapse-btn" title="${block.isCollapsed ? 'Expand' : 'Collapse'}">
                                <i class="bi ${block.isCollapsed ? 'bi-chevron-down' : 'bi-chevron-up'} text-muted"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Block Body -->
                    <div class="structure-block-body ${block.isCollapsed ? 'd-none' : ''}">
                        <div class="mb-1 d-flex justify-content-between align-items-center">
                            <label class="form-label small text-muted mb-0">HTML Template Structure</label>
                            <span class="small text-muted font-monospace" style="font-size: 11px;">
                                Placeholders: <code class="text-primary">${placeholderHint}</code>
                            </span>
                        </div>
                        <textarea class="form-control block-template-textarea" rows="4" placeholder="Enter HTML wrapper structure here">${block.template}</textarea>
                    </div>
                </div>
            `;
            $list.append(blockEl);
        });
        
        // Update total counter badge
        $('#blockCountBadge').text(`${blocks.length} Blocks`);
    }

    // Initialize UI
    renderBlocks();

    // ==========================================================================
    // Event Handlers for Block Builder Actions
    // ==========================================================================
    
    // Add HTML Structure Block
    $('#addBlockButton').on('click', function() {
        const newId = 'block_' + Date.now();
        blocks.push({
            id: newId,
            name: 'New Custom Section',
            type: 'content',
            template: `<section class="custom-section py-3">\n    <div class="container">\n        <h2>{{heading}}</h2>\n        <p>{{paragraph}}</p>\n    </div>\n</section>`,
            isCollapsed: false
        });
        logSystemEvent('Added new HTML structure block.');
        renderBlocks();
        // Scroll to the bottom of the list
        const blocksList = document.getElementById('blocksList');
        blocksList.scrollTop = blocksList.scrollHeight;
    });

    // Toggle Collapse
    $(document).on('click', '.toggle-collapse-btn', function() {
        const id = $(this).closest('.structure-block').data('id');
        const block = blocks.find(b => b.id === id);
        if (block) {
            block.isCollapsed = !block.isCollapsed;
            renderBlocks();
        }
    });

    // Delete Block
    $(document).on('click', '.delete-block-btn', function() {
        const id = $(this).closest('.structure-block').data('id');
        blocks = blocks.filter(b => b.id !== id);
        logSystemEvent('Removed structure block.');
        renderBlocks();
    });

    // Duplicate Block
    $(document).on('click', '.duplicate-block-btn', function() {
        const id = $(this).closest('.structure-block').data('id');
        const original = blocks.find(b => b.id === id);
        if (original) {
            const index = blocks.indexOf(original);
            const copy = {
                ...original,
                id: 'block_' + Date.now(),
                name: original.name + ' (Copy)',
                isCollapsed: false
            };
            blocks.splice(index + 1, 0, copy);
            logSystemEvent(`Duplicated "${original.name}" block.`);
            renderBlocks();
        }
    });

    // Move Block Up
    $(document).on('click', '.move-up-btn', function(e) {
        e.stopPropagation();
        const id = $(this).closest('.structure-block').data('id');
        const block = blocks.find(b => b.id === id);
        if (block) {
            const index = blocks.indexOf(block);
            if (index > 0) {
                // Swap
                blocks[index] = blocks[index - 1];
                blocks[index - 1] = block;
                renderBlocks();
            }
        }
    });

    // Move Block Down
    $(document).on('click', '.move-down-btn', function(e) {
        e.stopPropagation();
        const id = $(this).closest('.structure-block').data('id');
        const block = blocks.find(b => b.id === id);
        if (block) {
            const index = blocks.indexOf(block);
            if (index < blocks.length - 1) {
                // Swap
                blocks[index] = blocks[index + 1];
                blocks[index + 1] = block;
                renderBlocks();
            }
        }
    });

    // Update block title on input change
    $(document).on('input', '.block-name-input', function() {
        const id = $(this).closest('.structure-block').data('id');
        const block = blocks.find(b => b.id === id);
        if (block) {
            block.name = $(this).val();
        }
    });

    // Update block match type select change
    $(document).on('change', '.block-type-select', function() {
        const id = $(this).closest('.structure-block').data('id');
        const block = blocks.find(b => b.id === id);
        if (block) {
            block.type = $(this).val();
            // Load standard templates for chosen type if empty
            if (block.type === 'table' && !block.template.includes('{{table}}')) {
                block.template = `<div class="table-responsive my-3">\n    <table class="table table-bordered align-middle">\n        {{table}}\n    </table>\n</div>`;
            } else if (block.type === 'list' && !block.template.includes('{{list}}')) {
                block.template = `<ul class="custom-list my-3">\n    {{list}}\n</ul>`;
            } else if (block.type === 'image' && !block.template.includes('{{image}}')) {
                block.template = `<div class="image-wrapper text-center my-4">\n    {{image}}\n</div>`;
            }
            renderBlocks();
        }
    });

    // Update block template code textarea change
    $(document).on('input', '.block-template-textarea', function() {
        const id = $(this).closest('.structure-block').data('id');
        const block = blocks.find(b => b.id === id);
        if (block) {
            block.template = $(this).val();
        }
    });

    // ==========================================================================
    // File Upload & Drag and Drop Events
    // ==========================================================================
    const $dropzone = $('#dropzone');
    const $wordFileInput = $('#wordFileInput');

    // Drag events
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
        if (files.length > 0) {
            handleSelectedFile(files[0]);
        }
    });

    $wordFileInput.on('change', function(e) {
        const files = e.target.files;
        if (files.length > 0) {
            handleSelectedFile(files[0]);
        }
    });

    function handleSelectedFile(file) {
        // Validate extension
        if (!file.name.endsWith('.docx')) {
            alert('Please select a valid Word document file (.docx)');
            logSystemEvent('Error: Selected file is not a .docx document.', 'warning');
            return;
        }
        
        currentFile = file;
        
        // Show file details
        $('#selectedFilename').text(file.name);
        $('#fileInfoContainer').removeClass('d-none').addClass('d-flex');
        
        logSystemEvent(`File selected: "${file.name}" (${(file.size / 1024).toFixed(1)} KB).`);
    }

    // Clear File button
    $('#clearFileButton').on('click', function() {
        currentFile = null;
        $wordFileInput.val('');
        $('#fileInfoContainer').removeClass('d-flex').addClass('d-none');
        
        // Clear outputs
        clearOutputs();
        logSystemEvent('Cleared current document file.');
    });

    function clearOutputs() {
        convertedHtml = '';
        $('#htmlOutputCode').text('<!-- Converted output will display here -->');
        Prism.highlightElement(document.getElementById('htmlOutputCode'));
        
        // Reset iframe preview
        const iframe = document.getElementById('previewIframe');
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write('');
        iframeDoc.close();
        
        $('#previewEmptyState').removeClass('d-none').addClass('d-flex');
    }

    // ==========================================================================
    // Conversion Settings Actions
    // ==========================================================================
    $('#saveSettingsBtn').on('click', function() {
        settings.wrapper = $('#settingWrapper').val();
        settings.cleanEmptyParagraphs = $('#cleanEmptyParagraphs').is(':checked');
        settings.cleanWordClasses = $('#cleanWordClasses').is(':checked');
        settings.cleanInlineStyles = $('#cleanInlineStyles').is(':checked');
        settings.styleMap = $('#settingStyleMap').val();
        
        logSystemEvent('Global conversion settings updated.');
    });

    // ==========================================================================
    // Main Document Converter Logic
    // ==========================================================================
    
    $('#convertButton').on('click', function() {
        if (!currentFile) {
            alert('Please upload a Microsoft Word document (.docx) first.');
            return;
        }
        
        logSystemEvent('Starting Word conversion process...', 'info');
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            
            // Build Mammoth Options
            const options = {};
            
            // Add custom style mappings if defined
            if (settings.styleMap.trim()) {
                options.styleMap = settings.styleMap.split('\n').filter(line => line.trim());
                logSystemEvent('Loaded custom style mappings.', 'info');
            }
            
            // Convert to HTML
            mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options)
                .then(function(result) {
                    const rawHtml = result.value;
                    const messages = result.messages;
                    
                    // Log mammoth warning logs if any
                    messages.forEach(msg => {
                        logConversionEvent(`[MAMMOTH] ${msg.type}: ${msg.message}`, 'warning');
                    });
                    
                    // Process and segment the parsed HTML content
                    processRawHtml(rawHtml);
                })
                .catch(function(err) {
                    console.error(err);
                    logSystemEvent(`Conversion crashed: ${err.message}`, 'warning');
                    alert('An error occurred during Word document conversion. See console logs for details.');
                });
        };
        
        reader.readAsArrayBuffer(currentFile);
    });

    // Parse raw HTML, clean elements, group into structures, and build template output
    function processRawHtml(rawHtml) {
        logSystemEvent('HTML structure extraction initiated.', 'info');
        
        // Load into DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');
        const body = doc.body;
        
        // Apply Element Cleaning Rules (inline styles, word styling classes, empty paragraphs)
        cleanDomTree(body);
        
        // Segment children elements into contiguous logical groups mapped to sections
        const childNodes = Array.from(body.children);
        const sections = [];
        let currentSection = null;
        
        childNodes.forEach(el => {
            const tagName = el.tagName.toUpperCase();
            
            // Check if it's a heading element (H1 - H6) which starts a new parent card section
            if (tagName.match(/^H[1-6]$/)) {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    heading: el,
                    children: []
                };
                logConversionEvent(`Heading detected: "${el.textContent.substring(0, 30)}${el.textContent.length > 30 ? '...' : ''}"`, 'info');
            } 
            // Sub-elements under a heading or at the root level
            else {
                if (!currentSection) {
                    // Create a root-level section if no heading was encountered yet
                    currentSection = {
                        heading: null,
                        children: []
                    };
                }
                
                // Identify the specific tag type and group accordingly
                if (tagName === 'TABLE') {
                    currentSection.children.push({
                        type: 'table',
                        element: el
                    });
                    logConversionEvent('Table converted', 'success');
                } 
                else if (tagName === 'UL' || tagName === 'OL') {
                    currentSection.children.push({
                        type: 'list',
                        element: el
                    });
                    logConversionEvent('List converted', 'success');
                } 
                else if (tagName === 'IMG') {
                    currentSection.children.push({
                        type: 'image',
                        element: el
                    });
                    logConversionEvent('Image converted', 'success');
                } 
                else if (tagName === 'P' && el.children.length === 1 && el.children[0].tagName.toUpperCase() === 'IMG') {
                    currentSection.children.push({
                        type: 'image',
                        element: el.children[0]
                    });
                    logConversionEvent('Image converted', 'success');
                } 
                else {
                    // Text Paragraph Content
                    const text = el.textContent.trim();
                    const hasImg = el.getElementsByTagName('img').length > 0;
                    
                    if (tagName === 'P' && text === '' && !hasImg && settings.cleanEmptyParagraphs) {
                        logConversionEvent('Paragraph skipped: empty content', 'warning');
                    } else {
                        // Check if the last item in children is already a content block so we group text paragraphs
                        let lastChild = currentSection.children[currentSection.children.length - 1];
                        if (lastChild && lastChild.type === 'content') {
                            lastChild.paragraphs.push(el);
                        } else {
                            currentSection.children.push({
                                type: 'content',
                                paragraphs: [el]
                            });
                        }
                        logConversionEvent('Paragraph detected', 'info');
                    }
                }
            }
        });
        
        // Push the final section
        if (currentSection) {
            sections.push(currentSection);
        }
        
        // Process final template block assembly
        assembleTemplateBlocks(sections);
    }

    // Clean DOM tree recursively based on rules
    function cleanDomTree(parentEl) {
        const children = Array.from(parentEl.children);
        
        children.forEach(el => {
            // Detect if a paragraph is styled as a heading (fully bold, short, no ending period)
            if (el.tagName.toUpperCase() === 'P') {
                const text = el.textContent.trim();
                const childNodes = Array.from(el.childNodes);
                
                const isSingleBoldChild = el.children.length === 1 && 
                    (el.children[0].tagName.toUpperCase() === 'STRONG' || el.children[0].tagName.toUpperCase() === 'B');
                
                const isFullyBold = isSingleBoldChild || 
                    (childNodes.length === 1 && childNodes[0].nodeType === Node.ELEMENT_NODE && 
                     (childNodes[0].tagName.toUpperCase() === 'STRONG' || childNodes[0].tagName.toUpperCase() === 'B'));

                if (isFullyBold && text.length > 0 && text.length < 80) {
                    if (!text.endsWith('.')) {
                        logConversionEvent(`Detected paragraph styled as heading: "${text}" - converting to Heading`, 'info');
                        const hTag = document.createElement('h3');
                        hTag.innerHTML = el.querySelector('strong, b').innerHTML;
                        el.parentNode.replaceChild(hTag, el);
                        el = hTag; // Use the new heading element reference
                    }
                }
            }

            // Clean attributes
            if (settings.cleanInlineStyles) {
                el.removeAttribute('style');
            }
            
            if (settings.cleanWordClasses) {
                // Strip class names that typically match Word formats (e.g. MS Word export lists, font types)
                el.removeAttribute('class');
            }
            
            // Clean children recursively
            cleanDomTree(el);
            
            // Post-cleaning checks: remove empty paragraphs
            if (settings.cleanEmptyParagraphs && el.tagName.toUpperCase() === 'P') {
                if (el.textContent.trim() === '' && el.getElementsByTagName('img').length === 0) {
                    el.remove();
                }
            }
        });
    }

    // Merge HTML templates and replacement properties
    function assembleTemplateBlocks(sections) {
        logSystemEvent('Applying block-based templates...', 'info');
        
        let finalHtmlList = [];
        
        // Helper to select the best template block match based on section elements
        function findBestBlock(type, hasParagraph) {
            const matches = blocks.filter(b => b.type === type);
            if (matches.length === 0) return null;
            if (matches.length === 1) return matches[0];
            
            // Prioritize block templates based on paragraph placeholders
            if (hasParagraph) {
                const withPara = matches.find(b => b.template.includes('{{paragraph}}'));
                if (withPara) return withPara;
            } else {
                const withoutPara = matches.find(b => !b.template.includes('{{paragraph}}'));
                if (withoutPara) return withoutPara;
            }
            
            return matches[0];
        }

        sections.forEach(section => {
            // Case 1: Root-level elements (no parent heading) -> Output outside at root
            if (!section.heading) {
                section.children.forEach(child => {
                    const html = compileStandaloneChild(child);
                    if (html) finalHtmlList.push(html);
                });
                return;
            }
            
            // Case 2: Element falls under a parent heading -> Nest inside parent card
            // Determine primary section type: table, list, image, or standard content
            let sectionType = 'content';
            let tableEl = null;
            let listEl = null;
            let imageEl = null;
            
            section.children.forEach(child => {
                if (child.type === 'table' && !tableEl) {
                    tableEl = child.element;
                    sectionType = 'table';
                } else if (child.type === 'list' && !listEl) {
                    listEl = child.element;
                    if (sectionType === 'content') sectionType = 'list';
                } else if (child.type === 'image' && !imageEl) {
                    imageEl = child.element;
                    if (sectionType === 'content') sectionType = 'image';
                }
            });
            
            // Collect paragraph contents in this section
            const paragraphs = [];
            section.children.forEach(child => {
                if (child.type === 'content') {
                    child.paragraphs.forEach(p => paragraphs.push(p.innerHTML));
                }
            });
            
            const hasParagraph = paragraphs.length > 0;
            
            // Find active template block defined by user that matches the content type
            const matchedBlock = findBestBlock(sectionType, hasParagraph);
            
            if (!matchedBlock) {
                // Fallback: output raw elements
                finalHtmlList.push(section.heading.outerHTML);
                section.children.forEach(child => {
                    const html = compileStandaloneChild(child);
                    if (html) finalHtmlList.push(html);
                });
                return;
            }
            
            let templateMarkup = matchedBlock.template;
            const headingHtml = section.heading.innerHTML;
            
            // Determine what elements are consumed by the template block BEFORE placeholder replacement
            const paragraphConsumed = templateMarkup.includes('{{paragraph}}');
            const tableConsumed = templateMarkup.includes('{{table}}');
            const listConsumed = templateMarkup.includes('{{list}}');
            const imageConsumed = templateMarkup.includes('{{image}}');
            
            // Substitute heading in template block
            templateMarkup = templateMarkup.replace(/\{\{heading\}\}/g, headingHtml);
            
            // Smart paragraph substitution: output individual <p> tags
            if (paragraphConsumed) {
                // Check if wrapped in a p tag with optional attributes (e.g., <p class="lead">{{paragraph}}</p>)
                const pTagRegex = /<p([^>]*)>\s*\{\{paragraph\}\}\s*<\/p>/;
                const match = templateMarkup.match(pTagRegex);
                
                if (match) {
                    const attrs = match[1]; // Extract attributes (e.g. ' class="lead"')
                    const styledParagraphsHtml = paragraphs.map(pText => `<p${attrs}>${pText}</p>`).join('\n');
                    templateMarkup = templateMarkup.replace(pTagRegex, styledParagraphsHtml);
                } else {
                    const defaultParagraphsHtml = paragraphs.map(pText => `<p>${pText}</p>`).join('\n');
                    templateMarkup = templateMarkup.replace(/\{\{paragraph\}\}/g, defaultParagraphsHtml);
                }
            }
            
            if (sectionType === 'table' && tableEl) {
                templateMarkup = templateMarkup.replace(/\{\{table\}\}/g, tableEl.innerHTML);
            }
            else if (sectionType === 'list' && listEl) {
                const listInner = listEl.innerHTML;
                // Handle nested <li> items in user's templates safely
                templateMarkup = templateMarkup.replace(/<li>\s*\{\{list\}\}\s*<\/li>/g, listInner);
                templateMarkup = templateMarkup.replace(/\{\{list\}\}/g, listInner);
            }
            else if (sectionType === 'image' && imageEl) {
                templateMarkup = templateMarkup.replace(/\{\{image\}\}/g, imageEl.outerHTML);
            }
            
            // Gather any unconsumed elements in the section to append at the bottom
            let otherChildren = [];
            
            section.children.forEach(child => {
                if (child.type === 'table') {
                    if (!tableConsumed) {
                        otherChildren.push(child);
                    }
                } else if (child.type === 'list') {
                    if (!listConsumed) {
                        otherChildren.push(child);
                    }
                } else if (child.type === 'image') {
                    if (!imageConsumed) {
                        otherChildren.push(child);
                    }
                } else if (child.type === 'content') {
                    if (!paragraphConsumed) {
                        otherChildren.push(child);
                    }
                }
            });
            
            // Clean empty HTML tags inside template block
            templateMarkup = cleanEmptyTags(templateMarkup);
            
            // Append any other children that weren't the primary type (e.g. follow-up elements)
            if (otherChildren.length > 0) {
                const parser = new DOMParser();
                const parentDoc = parser.parseFromString(templateMarkup, 'text/html');
                const parentContainer = parentDoc.body.firstElementChild;
                
                if (parentContainer) {
                    otherChildren.forEach(child => {
                        const childHtml = compileStandaloneChild(child);
                        if (childHtml) {
                            const childDoc = parser.parseFromString(childHtml, 'text/html');
                            const nodes = Array.from(childDoc.body.childNodes);
                            nodes.forEach(node => {
                                parentContainer.appendChild(node);
                            });
                        }
                    });
                    templateMarkup = parentDoc.body.innerHTML;
                } else {
                    otherChildren.forEach(child => {
                        const childHtml = compileStandaloneChild(child);
                        if (childHtml) {
                            templateMarkup += '\n' + childHtml;
                        }
                    });
                }
            }
            
            finalHtmlList.push(templateMarkup);
        });
        
        // Helper to compile standalone elements
        function compileStandaloneChild(child) {
            if (child.type === 'content') {
                return child.paragraphs.map(p => p.outerHTML).join('\n');
            }
            
            const matchedBlock = findBestBlock(child.type, false);
            if (!matchedBlock) {
                return child.element.outerHTML;
            }
            
            let templateMarkup = matchedBlock.template;
            
            if (child.type === 'table') {
                templateMarkup = templateMarkup.replace(/\{\{table\}\}/g, child.element.innerHTML);
            }
            else if (child.type === 'list') {
                const listInner = child.element.innerHTML;
                templateMarkup = templateMarkup.replace(/<li>\s*\{\{list\}\}\s*<\/li>/g, listInner);
                templateMarkup = templateMarkup.replace(/\{\{list\}\}/g, listInner);
            }
            else if (child.type === 'image') {
                templateMarkup = templateMarkup.replace(/\{\{image\}\}/g, child.element.outerHTML);
            }
            
            return cleanEmptyTags(templateMarkup);
        }

        // Recursively clean empty formatting and layout tags from generated HTML
        function cleanEmptyTags(htmlString) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const body = doc.body;
            
            const selectors = 'p, h1, h2, h3, h4, h5, h6, ul, ol, span, strong, em';
            let removedAny = true;
            
            while (removedAny) {
                removedAny = false;
                body.querySelectorAll(selectors).forEach(el => {
                    const isEmptyText = el.textContent.trim() === '';
                    const hasNoElements = el.children.length === 0;
                    if (isEmptyText && hasNoElements) {
                        el.remove();
                        removedAny = true;
                    }
                });
            }
            
            return body.innerHTML;
        }

        const combinedBlocks = finalHtmlList.join('\n\n');
        
        // Wrap final blocks depending on layout settings selection
        if (settings.wrapper === 'html5') {
            convertedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentFile ? currentFile.name.replace('.docx', '') : 'Converted Document'}</title>
    <style>
        body {
            font-family: 'Inter', system-ui, sans-serif;
            line-height: 1.6;
            color: #212529;
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        table, th, td {
            border: 1px solid #dee2e6;
        }
        th, td {
            padding: 12px;
            text-align: left;
        }
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
        }
        .custom-list {
            padding-left: 20px;
            margin: 16px 0;
        }
        .custom-list li {
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
${combinedBlocks}
</body>
</html>`;
        } 
        else if (settings.wrapper === 'bootstrap5') {
            convertedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentFile ? currentFile.name.replace('.docx', '') : 'Converted Document'}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #f8f9fa;
        }
        .custom-list {
            padding-left: 20px;
            margin: 16px 0;
        }
        .custom-list li {
            margin-bottom: 8px;
        }
    </style>
</head>
<body class="py-5">
    <div class="container bg-white p-5 rounded shadow-sm" style="max-width: 900px;">
        ${combinedBlocks}
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
        } 
        else {
            convertedHtml = combinedBlocks;
        }
        
        // Write outputs
        renderOutputPreview();
        renderOutputCode();
        
        logSystemEvent('Conversion completed successfully!', 'success');
        
        // Switch tab to Live Preview
        $('#preview-tab').tab('show');
    }

    // Renders Preview frame inside sandbox IFrame
    function renderOutputPreview() {
        $('#previewEmptyState').addClass('d-none').removeClass('d-flex');
        
        const iframe = document.getElementById('previewIframe');
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        
        // Write content
        if (settings.wrapper === 'none') {
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body {
                            font-family: 'Inter', system-ui, sans-serif;
                            padding: 20px;
                            color: #212529;
                            line-height: 1.5;
                        }
                        img { max-width: 100%; height: auto; display: block; margin: 0 auto;}
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        table, th, td { border: 1px solid #dee2e6; }
                        th, td { padding: 8px; text-align: left; }
                        .custom-list { padding-left: 20px; }
                    </style>
                </head>
                <body>
                    ${convertedHtml}
                </body>
                </html>
            `);
        } else {
            iframeDoc.write(convertedHtml);
        }
        iframeDoc.close();
    }

    // Encodes characters safely and inserts formatted syntax highlight
    function renderOutputCode() {
        const escapeHtml = (text) => {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        const $code = $('#htmlOutputCode');
        $code.html(escapeHtml(convertedHtml));
        Prism.highlightElement(document.getElementById('htmlOutputCode'));
    }

    // Refresh Live Preview action
    $('#refreshPreview').on('click', function() {
        if (convertedHtml) {
            renderOutputPreview();
            logSystemEvent('Refreshed iframe preview viewport.');
        }
    });

    // ==========================================================================
    // Clipboard Copy & File Download triggers
    // ==========================================================================
    
    // Copy HTML to Clipboard
    $('#copyHtmlButton').on('click', function() {
        if (!convertedHtml) {
            alert('No converted HTML available to copy. Please run conversion.');
            return;
        }
        
        navigator.clipboard.writeText(convertedHtml)
            .then(() => {
                const $btn = $(this);
                const originalHtml = $btn.html();
                $btn.html('<i class="bi bi-check-lg"></i> <span>Copied!</span>');
                $btn.removeClass('btn-dark').addClass('btn-success');
                
                logSystemEvent('Copied output HTML code to clipboard.');
                
                setTimeout(() => {
                    $btn.html(originalHtml);
                    $btn.removeClass('btn-success').addClass('btn-dark');
                }, 2000);
            })
            .catch(err => {
                console.error(err);
                alert('Could not copy text to clipboard.');
            });
    });

    // Download HTML File
    $('#downloadHtmlButton').on('click', function() {
        if (!convertedHtml) {
            alert('No converted HTML available to download. Please run conversion.');
            return;
        }
        
        const blob = new Blob([convertedHtml], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const filename = currentFile ? currentFile.name.replace('.docx', '.html') : 'template-output.html';
        
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        logSystemEvent(`Downloaded file: "${filename}".`);
    });

    // ==========================================================================
    // Console Logs and Event Tracing
    // ==========================================================================
    
    function logSystemEvent(msg, type = 'system') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `<div class="log-entry log-${type}">[${timestamp}] ${msg}</div>`;
        const $logs = $('#logsContainer');
        $logs.append(entry);
        // Scroll logs window
        $logs.scrollTop($logs[0].scrollHeight);
    }
    
    function logConversionEvent(msg, status = 'info') {
        const entry = `<div class="log-entry log-${status}"><i class="bi ${status === 'success' ? 'bi-check-circle-fill' : status === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'} me-2"></i>${msg}</div>`;
        const $logs = $('#logsContainer');
        $logs.append(entry);
        $logs.scrollTop($logs[0].scrollHeight);
    }

    // Clear logs action
    $('#clearLogsButton').on('click', function() {
        $('#logsContainer').empty();
        logSystemEvent('Console cleared.');
    });

    // ==========================================================================
    // Theme Switcher Layout Control
    // ==========================================================================
    
    const $themeToggle = $('#themeToggle');
    
    // Check local storage for theme setting
    let savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    $themeToggle.on('click', function() {
        const currentTheme = $('html').attr('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
    });

    function setTheme(theme) {
        $('html').attr('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (theme === 'dark') {
            $themeToggle.html('<i class="bi bi-sun-fill text-warning"></i>');
            logSystemEvent('Dark Mode theme enabled.');
        } else {
            $themeToggle.html('<i class="bi bi-moon-fill"></i>');
            logSystemEvent('Light Mode theme enabled.');
        }
    }
});
