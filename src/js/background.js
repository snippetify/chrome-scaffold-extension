import $ from 'jquery'
import {
    CS_TARGET,
    SNIPPETIFY_URL,
    CS_MODAL_TARGET,
    CS_SNIPPETS_COUNT,
    SNIPPETIFY_DOMAIN,
    CS_FOUND_SNIPPETS,
    SNIPPETIFY_API_URL,
    SNIPPETIFY_API_TOKEN,
    SNIPPETIFY_SAVE_USER,
    REVIEW_SLECTED_SNIPPET,
    SNIPPETIFY_FOUND_SNIPPETS
} from './contants'

/**
 * Background. App event listeners.
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
*/
class Background {
    constructor () {
        this.onInstalled()
        this.cookieEventListener()
        this.navigationEventListener()
        this.contentScriptsEventListener()
    }

    /**
     * Execute action when extension installed.
     * @returns void
    */
    onInstalled () {
        chrome.runtime.onInstalled.addListener(() => {
            this.createContextMenu()
            this.saveCookieToStorage()
        })
    }

    /**
     * Create context menu on installed.
     * @returns void
    */
    createContextMenu () {
        // Create menu
        chrome.contextMenus.create({
            id: 'snippetifyContextMenu',
            title: 'Save snippet',
            contexts: ['selection']
        })

        // Add listener
        chrome.contextMenus.onClicked.addListener(function (info) {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    target: CS_TARGET,
                    type: REVIEW_SLECTED_SNIPPET,
                    payload: { code: info.selectionText }
                })
            })
        })
    }

    /**
     * Save snippetify user token on installed.
     * @returns void
    */
    saveCookieToStorage () {
        chrome.cookies.get({ url: SNIPPETIFY_URL, name: 'token' }, cookie => {
            const value = ((cookie || {}).value || '')
            if (value.length > 1) {
                chrome.storage.local.set({ [SNIPPETIFY_API_TOKEN]: value }, () => {
                    this.authenticateUser(value)
                })
            } else {
                chrome.storage.local.remove(SNIPPETIFY_API_TOKEN, () => {
                    this.logoutUser()
                })
            }
        })
    }

    /**
     * Listen for cookies changed.
     * Save snippetify user token on installed.
     * @returns void
    */
    cookieEventListener () {
        chrome.cookies.onChanged.addListener(e => {
            if ((e.cookie || {}).domain !== SNIPPETIFY_DOMAIN) return
            if (e.removed) {
                chrome.storage.local.remove(SNIPPETIFY_API_TOKEN, () => {
                    this.logoutUser()
                })
            } else {
                chrome.storage.local.set({ [SNIPPETIFY_API_TOKEN]: e.cookie.value }, () => {
                    this.authenticateUser(e.cookie.value)
                })
            }
        })
    }

    /**
     * Listen for page loaded event.
     * Listen for tab changed event.
     * @returns void
    */
    navigationEventListener () {
        // Listen for tab changed
        chrome.tabs.onActivated.addListener(info => {
            chrome.tabs.sendMessage(info.tabId, { target: CS_TARGET, type: CS_SNIPPETS_COUNT }, e => {
                if (e && e.payload) chrome.browserAction.setBadgeText({ text: `${e.payload || ''}` })
            })
            chrome.tabs.sendMessage(info.tabId, { target: CS_TARGET, type: CS_FOUND_SNIPPETS }, e => {
                if (e && e.payload) chrome.storage.local.set({ [SNIPPETIFY_FOUND_SNIPPETS]: e.payload })
            })
        })

        // Listen for page loaded
        chrome.webNavigation.onCompleted.addListener(info => {
            chrome.tabs.sendMessage(info.tabId, { target: CS_TARGET, type: CS_SNIPPETS_COUNT }, e => {
                if (e && e.payload) chrome.browserAction.setBadgeText({ text: `${e.payload || ''}` })
            })
            chrome.tabs.sendMessage(info.tabId, { target: CS_TARGET, type: CS_FOUND_SNIPPETS }, e => {
                if (e && e.payload) chrome.storage.local.set({ [SNIPPETIFY_FOUND_SNIPPETS]: e.payload })
            })
        })
    }

    /**
     * Content scripts event listener.
     * @returns void
    */
    contentScriptsEventListener () {
        chrome.runtime.onMessage.addListener(e => {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                if ([CS_TARGET, CS_MODAL_TARGET].includes(e.target)) {
                    chrome.tabs.sendMessage(tabs[0].id, e)
                }
            })
        })
    }

    /**
     * Authenticate user.
     * @returns void
    */
    authenticateUser (token) {
        $.ajax({
            method: 'GET',
            url: `${SNIPPETIFY_API_URL}/users/me`,
            contentType: 'application/json',
            crossDomain: true,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
            }
        }).done(res => {
            chrome.storage.local.set({ [SNIPPETIFY_SAVE_USER]: res.data })
        }).fail((xhr, status) => {
            chrome.storage.local.remove(SNIPPETIFY_SAVE_USER)
        })
    }

    /**
     * Logout user.
     * @returns void
    */
    logoutUser () {
        chrome.storage.local.remove(SNIPPETIFY_API_TOKEN)
        chrome.storage.local.remove(SNIPPETIFY_SAVE_USER)
    }
}

// Initialisation
export default new Background()
