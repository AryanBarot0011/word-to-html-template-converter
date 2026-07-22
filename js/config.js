/**
 * ConverterConfig - Manages application configuration state & default rules.
 */
(function(window) {
    'use strict';

    const defaultConfig = {
        wrapper: {
            mode: 'repeat', // 'repeat' (Mode A) or 'single' (Mode B)
            tag: 'div',
            class: 'blog-info-details',
            id: '',
            attrs: '',
            headingParentTag: '',
            headingParentClass: '',
            contentParentTag: '',
            contentParentClass: ''
        },
        headings: {
            h1: { tag: 'h1', class: 'heading' },
            h2: { tag: 'h2', class: 'heading' },
            h3: { tag: 'h3', class: 'heading' },
            h4: { tag: 'h4', class: '' },
            h5: { tag: 'h5', class: '' },
            h6: { tag: 'h6', class: '' }
        },
        paragraph: {
            tag: 'p',
            class: 'mb-3'
        },
        list: {
            ul: { tag: 'ul', class: 'list-style' },
            ol: { tag: 'ol', class: 'ordered-list' },
            li: { tag: 'li', class: 'mt-3' }
        },
        table: {
            wrapper: { tag: '', class: '', attrs: '' },
            table: { tag: 'table', class: 'table table-bordered', attrs: '' },
            thead: { tag: 'thead', class: '', attrs: '' },
            tbody: { tag: 'tbody', class: '', attrs: '' },
            tfoot: { tag: 'tfoot', class: '', attrs: '' },
            tr: { tag: 'tr', class: '', attrs: '' },
            th: { tag: 'th', class: 'heading-cell', attrs: '', innerTag: '', innerClass: '' },
            td: { tag: 'td', class: 'text-center', attrs: '', innerTag: '', innerClass: '' }
        },
        image: {
            class: 'img-fluid rounded',
            loading: 'lazy',
            decoding: 'async',
            alt: '',
            width: '',
            height: '',
            wrapperTag: '',
            wrapperClass: ''
        },
        startCode: '',
        endCode: '',
        links: []
    };

    let currentConfig = JSON.parse(JSON.stringify(defaultConfig));

    const ConverterConfig = {
        getDefaults: function() {
            return JSON.parse(JSON.stringify(defaultConfig));
        },
        get: function() {
            return currentConfig;
        },
        set: function(newConfig) {
            currentConfig = JSON.parse(JSON.stringify(newConfig));
            return currentConfig;
        },
        reset: function() {
            currentConfig = JSON.parse(JSON.stringify(defaultConfig));
            return currentConfig;
        },
        updateField: function(path, value) {
            const keys = path.split('.');
            let obj = currentConfig;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) obj[keys[i]] = {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
        }
    };

    window.ConverterConfig = ConverterConfig;
})(window);
