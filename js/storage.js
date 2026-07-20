/**
 * ConverterStorage - Manages LocalStorage persistence and JSON import/export.
 */
(function(window) {
    'use strict';

    const STORAGE_KEY = 'word_to_html_converter_config';

    const ConverterStorage = {
        save: function(config) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
                return true;
            } catch (e) {
                console.error('Failed to save settings to localStorage:', e);
                return false;
            }
        },
        load: function() {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                console.error('Failed to load settings from localStorage:', e);
                return null;
            }
        },
        clear: function() {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {
                console.error('Failed to clear settings from localStorage:', e);
            }
        },
        exportToFile: function(config, filename = 'settings.json') {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute('href', dataStr);
            downloadAnchor.setAttribute('download', filename);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        },
        importFromFile: function(file, callback) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const parsed = JSON.parse(e.target.result);
                    callback(null, parsed);
                } catch (err) {
                    callback(err, null);
                }
            };
            reader.onerror = function(err) {
                callback(err, null);
            };
            reader.readAsText(file);
        }
    };

    window.ConverterStorage = ConverterStorage;
})(window);
