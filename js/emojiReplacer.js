/**
 * EmojiReplacer - Scans template strings for Unicode emojis and replaces them with
 * custom images based on surrounding text context or fallback definitions.
 */
(function(window) {
    'use strict';

    const emojiFallbackMap = {
        // Smiles & Emotion
        "😀": "smile happy", "😃": "smile happy joy", "😄": "smile happy joy", "😁": "grin smile happy",
        "😆": "laugh happy joy", "😅": "sweat-smile laugh nervous", "🤣": "rofl laugh face", "😂": "joy laugh haha cry",
        "🙂": "slight-smile", "🙃": "upside-down", "😉": "wink", "😊": "blush smile happy", "😇": "angel innocent",
        "🥰": "hearts love blush", "😍": "heart-eyes love", "🤩": "star-struck excited", "😘": "kiss blow-kiss love",
        "😗": "kiss", "😚": "kiss closed-eyes", "😙": "kiss smile", "😋": "yum delicious tasty tongue",
        "😛": "tongue", "😜": "tongue wink", "🤪": "zany goofy crazy", "😝": "tongue closed-eyes",
        "🤑": "money-mouth rich money", "🤗": "hug", "🤭": "hand-mouth shy", "🤫": "shush quiet",
        "🤔": "thinking wonder", "🤐": "zipper quiet", "🤨": "raised-eyebrow skeptical", "😐": "neutral blank",
        "😑": "expressionless blank", "😶": "no-mouth quiet", "😏": "smirk sly", "😒": "unamused annoyed",
        "🙄": "rolling-eyes annoy", "😬": "grimace", "🤥": "lying", "😌": "relieved calm", "😔": "pensive sad",
        "😪": "sleepy tired", "🤤": "drool mouth", "😴": "sleeping sleep zzz", "😷": "mask sick",
        "🤒": "thermometer sick", "🤕": "bandage hurt", "🤢": "nausea sick", "🤮": "vomit puke sick",
        "🤧": "sneeze sick", "🥵": "hot sweat", "🥶": "cold freeze ice", "🥴": "woozy drunk",
        "😵": "dizzy dead", "🤯": "exploding head shock", "🤠": "cowboy", "🥳": "party celebrate",
        "😎": "cool glasses sunglasses", "🤓": "nerd geek glasses", "🧐": "monocle", "😕": "confused",
        "😟": "worried", "🙁": "slight-frown", "☹️": "frown sad", "😮": "surprise gasp open-mouth",
        "😯": "hush gasp", "😲": "astonished surprise", "😳": "flushed blush shock", "🥺": "pleading crying cry sad sob weep",
        "😦": "frown gasp", "😧": "anguish gasp", "😨": "fear scared shock", "😰": "sweat-fear anxious",
        "😥": "sad sweat relieve", "😢": "cry crying sad tear sob weep", "😭": "sob crying cry sad tear weep",
        "😱": "scream scared shock horror", "😖": "confounded struggle", "😣": "persevere struggle",
        "😞": "disappointed sad", "😓": "sweat sad", "😩": "weary tired crying", "😫": "tired crying struggle",
        "🥱": "yawn tired", "😤": "triumph steam mad", "😡": "rage angry mad", "😠": "angry mad",
        "🤬": "cursing angry", "😈": "devil angry evil", "👿": "imp angry evil", "💀": "skull bone dead",
        "☠️": "crossbones dead", "💩": "poop turd", "🤡": "clown", "👹": "ogre monster", "👺": "goblin",
        "👻": "ghost spooky", "👽": "alien space", "👾": "pixel monster alien", "🤖": "robot tech",
        // Hearts & Symbols
        "❤️": "heart love red", "🧡": "heart orange", "💛": "heart yellow", "💚": "heart green",
        "💙": "heart blue", "💜": "heart purple", "🖤": "heart black", "🤍": "heart white",
        "🤎": "heart brown", "💔": "broken-heart sad", "❣️": "heart exclamation", "💕": "two-hearts love",
        "💞": "revolving-hearts", "💓": "beating-heart", "💗": "growing-heart", "💖": "sparkle-heart",
        "💘": "arrow-heart", "💝": "gift-heart", "💟": "heart decoration", "🔥": "fire hot trend",
        "✨": "sparkles shiny star", "⭐": "star yellow", "🌟": "sparkling-star", "💥": "collision explosion",
        "💯": "hundred score perfect",
        // Common Hand gestures
        "👍": "thumbs-up like yes approve", "👎": "thumbs-down dislike no", "✊": "fist raise",
        "👊": "fist punch", "🤛": "fist-left", "🤜": "fist-right", "🤞": "fingers-crossed",
        "🤟": "love-you", "🤘": "rock-on", "👌": "ok-hand perfect", "👈": "point-left",
        "👉": "point-right", "👆": "point-up", "👇": "point-down", "☝️": "index-pointing",
        "✋": "raised-hand stop", "🤚": "backhand", "🖐️": "splayed-hand", "🖖": "vulcan",
        "👋": "wave hello goodbye", "🤙": "call-me", "💪": "flex muscle strength", "👏": "clap applaud",
        "🙌": "raising-hands celebrate", "👐": "open-hands", "🤲": "palms-up", "🤝": "handshake agree",
        "🙏": "pray thank-you please",
    };

    let emojiDatabase = {};

    const EmojiReplacer = {
        // Regex to identify Unicode Emojis (including text-style symbols like heart and star)
        emojiRegex: /[\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\u2600-\u27BF]/gu,

        setEmojiDatabase: function(data) {
            emojiDatabase = data;
        },

        isEmoji: function(char) {
            // Filter out normal alphanumeric characters, spaces, and common keyboard punctuation
            if (/^[0-9A-Za-z\s.,\/#!$%\^&\*;:{}=\-_`~()?"'<>\[\]\\|]$/.test(char)) {
                return false;
            }
            // Check if it matches the broad Unicode Emoji range
            const match = char.match(/[\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\u2600-\u27BF]/gu);
            return match !== null && match.length > 0;
        },

        getSurroundingWords: function(rawCode, emojiIndex, emojiLength) {
            // Retrieve 100 characters before and after the emoji
            const leftRaw = rawCode.substring(Math.max(0, emojiIndex - 100), emojiIndex);
            const rightRaw = rawCode.substring(emojiIndex + emojiLength, Math.min(rawCode.length, emojiIndex + emojiLength + 100));

            // Strip HTML tags so that text elements inside neighboring tags are visible
            const stripTags = (str) => str.replace(/<\/?[a-zA-Z0-9-]+(?:\s+[^>]*)?>/g, ' ');
            const cleanLeft = stripTags(leftRaw);
            const cleanRight = stripTags(rightRaw);

            // Alphanumeric and special character word matching
            const wordRegex = /[a-zA-Z0-9%*+]+/g;
            const leftWords = (cleanLeft.match(wordRegex) || []).map(w => w.toLowerCase());
            const rightWords = (cleanRight.match(wordRegex) || []).map(w => w.toLowerCase());

            // Order by proximity to the emoji
            return {
                left: leftWords.reverse(), // closer words first
                right: rightWords // closer words first
            };
        },

        findImageByPrefixSearch: function(word, imageList) {
            if (!word || word.length < 1) return null;

            // Character-by-character search: c -> cr -> cry -> cryi -> cryin -> crying
            for (let len = 1; len <= word.length; len++) {
                const prefix = word.substring(0, len).toLowerCase();

                // Find images starting with this prefix (stripping extension)
                const matches = imageList.filter(img => {
                    const baseName = img.split('.')[0].toLowerCase();
                    return baseName === prefix || baseName.startsWith(prefix);
                });

                if (matches.length === 1) {
                    const matchedImage = matches[0];
                    const baseName = matchedImage.split('.')[0].toLowerCase();
                    
                    // Prevent single-character false positives (e.g. "save" matching "secure.svg" because it starts with "s")
                    if (prefix.length >= 2 || baseName === word.toLowerCase() || baseName.startsWith(word.toLowerCase()) || word.toLowerCase().startsWith(baseName)) {
                        return matchedImage;
                    }
                }
                if (matches.length === 0) {
                    break; // Matches went to zero, stop checking prefixes
                }
            }
            return null;
        },

        findImageBySubstringSearch: function(word, imageList) {
            if (!word || word.length < 2) return null;
            
            // Look for any image whose filename contains the word
            const matches = imageList.filter(img => {
                const baseName = img.split('.')[0].toLowerCase();
                return baseName.includes(word);
            });
            return matches.length > 0 ? matches[0] : null;
        },

        findBestMatch: function(words, imageList) {
            // 1. Try prefix search on words
            for (let i = 0; i < words.length; i++) {
                const match = EmojiReplacer.findImageByPrefixSearch(words[i], imageList);
                if (match) return { image: match, word: words[i], method: `Prefix Search ("${words[i].substring(0,2)}..." -> ${match})` };
            }

            // 2. Try substring match on words
            for (let i = 0; i < words.length; i++) {
                const match = EmojiReplacer.findImageBySubstringSearch(words[i], imageList);
                if (match) return { image: match, word: words[i], method: `Substring Match ("${words[i]}" -> ${match})` };
            }

            return null;
        },

        parseCustomMappings: function(text) {
            const map = {};
            if (!text || !text.trim()) return map;
            
            const lines = text.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                
                const parts = trimmed.split(':');
                if (parts.length >= 2) {
                    const emoji = parts[0].trim();
                    const filename = parts.slice(1).join(':').trim();
                    if (emoji && filename) {
                        map[emoji] = filename;
                    }
                }
            });
            return map;
        },

        replace: function(rawCode, imagePath, imageList = [], customMappingsText = '', imgConfig = {}) {
            if (!rawCode) return { processedCode: '', logs: [] };

            const customMap = EmojiReplacer.parseCustomMappings(customMappingsText);

            // Ensure path ends with slash if not empty
            let pathPrefix = imagePath ? imagePath.trim() : '';
            if (pathPrefix && !pathPrefix.endsWith('/') && !pathPrefix.endsWith('\\')) {
                pathPrefix += '/';
            }

            const logs = [];
            const matchesToReplace = [];

            // Find all emojis and their indices
            // Since replacing inline changes string indices, we run a search and record matches from last to first
            let regex = /[\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\u2600-\u27BF]/gu;
            let match;
            while ((match = regex.exec(rawCode)) !== null) {
                const emoji = match[0];
                const index = match.index;

                if (!EmojiReplacer.isEmoji(emoji)) continue;

                matchesToReplace.push({
                    emoji: emoji,
                    index: index,
                    length: emoji.length
                });
            }

            // Order matches from last to first to preserve indices during replace
            matchesToReplace.sort((a, b) => b.index - a.index);

            let processedCode = rawCode;

            matchesToReplace.forEach(m => {
                const surrounds = EmojiReplacer.getSurroundingWords(rawCode, m.index, m.length);
                let matchResult = null;

                // 1. Check custom overrides first
                const customFilename = customMap[m.emoji];
                if (customFilename) {
                    matchResult = {
                        image: customFilename,
                        word: 'custom',
                        method: `Custom Mapping Override ("${m.emoji}" -> ${customFilename})`
                    };
                }

                // Function to try matching a candidate word (both original and cleaned)
                const tryWordMatch = (word, label) => {
                    // Try original first
                    let match = EmojiReplacer.findImageByPrefixSearch(word, imageList);
                    if (match) return { image: match, word: word, method: `Prefix Search (${label} "${word}" -> ${match})` };

                    match = EmojiReplacer.findImageBySubstringSearch(word, imageList);
                    if (match) return { image: match, word: word, method: `Substring Match (${label} "${word}" -> ${match})` };

                    // If special characters exist, try cleaned version
                    const cleaned = word.replace(/[%*+]/g, '');
                    if (cleaned !== word && cleaned.length > 0) {
                        match = EmojiReplacer.findImageByPrefixSearch(cleaned, imageList);
                        if (match) return { image: match, word: cleaned, method: `Cleaned Prefix Search (${label} "${cleaned}" -> ${match})` };

                        match = EmojiReplacer.findImageBySubstringSearch(cleaned, imageList);
                        if (match) return { image: match, word: cleaned, method: `Cleaned Substring Match (${label} "${cleaned}" -> ${match})` };
                    }
                    return null;
                };

                // 2. Try forward (right/move-ahead) words first
                if (!matchResult) {
                    for (let i = 0; i < surrounds.right.length; i++) {
                        matchResult = tryWordMatch(surrounds.right[i], 'Forward');
                        if (matchResult) break;
                    }
                }

                // 3. Try backward (left) words next
                if (!matchResult) {
                    for (let i = 0; i < surrounds.left.length; i++) {
                        matchResult = tryWordMatch(surrounds.left[i], 'Backward');
                        if (matchResult) break;
                    }
                }

                // 4. Try Unicode DB / Fallback keywords
                if (!matchResult) {
                    let keywords = '';
                    const dbEntry = emojiDatabase[m.emoji];
                    if (dbEntry && dbEntry.name) {
                        keywords = dbEntry.name;
                    } else {
                        keywords = emojiFallbackMap[m.emoji] || '';
                    }

                    if (keywords) {
                        const fallbackWords = keywords.replace(/_/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
                        for (let i = 0; i < fallbackWords.length; i++) {
                            matchResult = tryWordMatch(fallbackWords[i], 'Fallback');
                            if (matchResult) break;
                        }
                    }
                }

                // Generate display context for logs
                const allContextWords = [...surrounds.right.slice(0,2), ...surrounds.left.slice(0,2)];

                if (matchResult) {
                    // Match found! Replace emoji with img tag
                    const altText = matchResult.word;
                    
                    let imgClass = (imgConfig && imgConfig.class) ? imgConfig.class.trim() : 'emoji-icon';
                    let imgWidth = (imgConfig && imgConfig.width) ? imgConfig.width.trim() : '';
                    let imgHeight = (imgConfig && imgConfig.height) ? imgConfig.height.trim() : '';
                    let imgAttrs = (imgConfig && imgConfig.attrs) ? imgConfig.attrs.trim() : '';

                    let attributesStr = '';
                    if (imgClass) attributesStr += ` class="${imgClass}"`;
                    if (imgWidth) attributesStr += ` width="${imgWidth}"`;
                    if (imgHeight) attributesStr += ` height="${imgHeight}"`;
                    if (imgAttrs) attributesStr += ` ${imgAttrs}`;

                    const imgTag = `<img src="${pathPrefix}${matchResult.image}" alt="${altText}"${attributesStr}>`;
                    
                    const leftPart = processedCode.substring(0, m.index);
                    const rightPart = processedCode.substring(m.index + m.length);
                    processedCode = leftPart + imgTag + rightPart;

                    logs.push({
                        emoji: m.emoji,
                        index: m.index,
                        context: allContextWords.join(', ') || '(none)',
                        image: matchResult.image,
                        tag: imgTag,
                        method: matchResult.method,
                        status: 'Success'
                    });
                } else {
                    // No match found in the image folder. We leave the emoji as is, but log it
                    logs.push({
                        emoji: m.emoji,
                        index: m.index,
                        context: allContextWords.join(', ') || '(none)',
                        image: '(none)',
                        tag: '(left unchanged)',
                        method: 'No match in image list',
                        status: 'Omitted'
                    });
                }
            });

            // Logs were generated backwards (last index first). Reverse them to restore logical order
            logs.reverse();

            // Calculate metrics
            const totalCount = matchesToReplace.length;
            const replacedCount = logs.filter(l => l.status === 'Success').length;
            const missingCount = totalCount - replacedCount;
            const accuracy = totalCount > 0 ? ((replacedCount / totalCount) * 100).toFixed(1) : '100.0';

            return {
                processedCode: processedCode,
                logs: logs,
                metrics: {
                    total: totalCount,
                    replaced: replacedCount,
                    missing: missingCount,
                    accuracy: accuracy
                }
            };
        }
    };

    window.EmojiReplacer = EmojiReplacer;
})(window);
