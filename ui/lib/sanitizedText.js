import EmojiConvertor from 'emoji-js';
import { createEmojiImages } from '../nostr/emojiText';

const emoji = new EmojiConvertor();

export function createLinksSanitized(text, maxImageHeight, clickableImage) {
    let _maxImageHeight = '20rem';
    if (maxImageHeight != undefined) _maxImageHeight = maxImageHeight;
    function isImage(url) {
        // INTENTIONAL EXCLUSIONS
        if (url.startsWith("https://primal.")) return false; // primal cdn fails to return, so dont even try to render as an image
        // ACCEPTABLE CONVERSIONS
        if (url.endsWith(".gif")) return true;
        if (url.endsWith(".jpg")) return true;
        if (url.endsWith(".png")) return true;
        if (url.endsWith(".webp")) return true;
        // ASSUMED IMAGES
        if (url.startsWith("https://www.tradingview.com/x/")) return true;
        if (url.startsWith("https://imgprxy.stacker.news/")) return true;
        if (url.startsWith("https://discords.com/_next/image")) return true;
        if (url.startsWith("https://cdn.discordapp.com/emojis/")) return true;
        if (url.startsWith("https://pbs.twimg.com/media/")) return true;
        return false;
    }    
    // Function to escape HTML entities
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    // Escape HTML entities in the text
    text = escapeHtml(text);
    // Convert **bold** to <b>bold</b>
    text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // Convert *italic* to <i>italic</i>
    text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
    // Convert ||spoilertext|| to <a className="spoiler" id="spoilerlink" href="#spoilerlink" title="Tap to reveal">spoilertext</a>
    let spoilermatches = text.match(/\|\|(.*?)\|\|/);
    if (spoilermatches) {
        let spoilercount = 0;
        for(let spoilermatch of spoilermatches) {
            spoilercount += 1;
            if (spoilercount % 2 == 1) {
                text = text.replace(/\|\|(.*?)\|\|/, '<a class="spoiler" id="spoilerlink' + spoilercount.toString() + '" href="#spoilerlink' + spoilercount.toString() + '" title="Tap to reveal">$1</a>');
            }
        }
    }
    // Regular expression to match URLs
    const urlRegex = /(\bhttps?:\/\/[^\s<>"']*[^\s<>"'?,]+)/gi;

    // Replace standard shortcode colon-sequences with emojis
    emoji.replace_mode = 'unified';
    emoji.allow_native = true;
    text = emoji.replace_colons(text);

    // Replace known emoji colon-sequences with image urls
    let knownEmojiTags = sessionStorage.getItem('knownEmojiTags');
    if (knownEmojiTags) {
        knownEmojiTags = JSON.parse(knownEmojiTags);
        text = createEmojiImages(text, knownEmojiTags);
    }

    // Replace URLs with <a> tags
    return text.replace(urlRegex, (match) => {
        // Check if there is a query string or fragment identifier
        const queryOrFragmentIndex = match.search(/[\?#]/);
        let url = match;
        let queryString = '';
        // If there is a query string or fragment identifier, separate it from the base URL
        if (queryOrFragmentIndex !== -1) {
            url = match.substring(0, queryOrFragmentIndex);
            queryString = match.substring(queryOrFragmentIndex);
        }
        if (isImage(url)) {
            // Special handler for discord urls
            if (url.startsWith("https://discords.com/_next/image")) {
                let decodedQuerystring = decodeURIComponent(queryString);
                decodedQuerystring = decodedQuerystring.replace("?url=", "");
                if (isImage(decodedQuerystring)) {
                    url = decodedQuerystring;
                }
            }
            // Images without a querystring
            const baseImageTag = `<img src="${url}" style="display:inline;max-height:${_maxImageHeight}" />`;
            if (clickableImage) {
                return `<a href="${url}" target="_blank">${baseImageTag}</a>`;
            } else {
                return baseImageTag;
            }
        } else {
            // Hyperlink
            // Return the <a> tag with the base URL and a second <a> tag for the full URL including the query string
            const baseUrlTag = `<a href="${url}" target="_blank" style="text-decoration:underline;">${url}</a>`;
            const fullUrlTag = queryString ? `<a href="${url}${queryString}" target="_blank" style="font-weight:300; text-decoration:underline;">${queryString}</a>` : '';
            return baseUrlTag + (queryString ? fullUrlTag: '');
        }
    });
}