import { getOS, getShortkeyOS, getAuthenticatedUser, isAuthenticated, getDocumentTypeLabel, getExtractionLevelTranslationKey } from '@/utils/utils'
import { removeCookie, setCookie } from 'tiny-cookie'

describe('utils', () => {
  let languageGetter

  beforeEach(() => {
    languageGetter = jest.spyOn(window.navigator, 'platform', 'get')
  })

  afterEach(() => removeCookie(process.env.VUE_APP_DS_COOKIE_NAME))

  describe('getOS', () => {
    it('should retrieve Mac OS', () => {
      languageGetter.mockReturnValue('MacIntel')
      expect(getOS()).toEqual('mac')
    })

    it('should retrieve Windows OS', () => {
      languageGetter.mockReturnValue('Win32')
      expect(getOS()).toEqual('windows')
    })

    it('should retrieve Linux OS', () => {
      languageGetter.mockReturnValue('Linux x86_64')
      expect(getOS()).toEqual('linux')
    })

    it('should retrieve no OS', () => {
      languageGetter.mockReturnValue('FreeBSD i386')
      expect(getOS()).toEqual('other')
    })
  })

  describe('getShortkeyOS', () => {
    it('should return "mac" if mac OS', () => {
      languageGetter.mockReturnValue('MacIntel')
      expect(getShortkeyOS()).toEqual('mac')
    })

    it('should return "default" if other than mac OS', () => {
      languageGetter.mockReturnValue('Other OS')
      expect(getShortkeyOS()).toEqual('default')
    })
  })

  describe('getAuthenticatedUser', () => {
    it('should return null if user is not authenticated', () => {
      expect(getAuthenticatedUser()).toBeNull()
    })

    it('should return null if cookie has no "login" field', () => {
      setCookie(process.env.VUE_APP_DS_COOKIE_NAME, 'doe', JSON.stringify)
      expect(getAuthenticatedUser()).toBeNull()
    })

    it('should return user login if user is authenticated', () => {
      setCookie(process.env.VUE_APP_DS_COOKIE_NAME, { 'login': 'doe' }, JSON.stringify)
      expect(getAuthenticatedUser()).toEqual('doe')
    })
  })

  describe('isAuthenticated', () => {
    it('should not be authenticated by default', () => {
      expect(isAuthenticated()).toBeFalsy()
    })

    it('should not be authenticated if the cookie has no login field', () => {
      setCookie(process.env.VUE_APP_DS_COOKIE_NAME, 'doe', JSON.stringify)
      expect(isAuthenticated()).toBeFalsy()
    })

    it('should be authenticated if there is a cookie with a login field', () => {
      setCookie(process.env.VUE_APP_DS_COOKIE_NAME, { 'login': 'doe' }, JSON.stringify)
      expect(isAuthenticated()).toBeTruthy()
    })
  })

  describe('getDocumentTypeLabel', () => {
    it('should retrieve the document type for PDF', () => {
      expect(getDocumentTypeLabel('application/pdf')).toEqual('Portable Document Format (PDF)')
    })

    it('should retrieve the document type if no type (1/2)', () => {
      expect(getDocumentTypeLabel('')).toEqual('')
    })

    it('should retrieve the document type if no type (2/2)', () => {
      expect(getDocumentTypeLabel()).toEqual('')
    })

    it('should retrieve the document type for unknown type', () => {
      expect(getDocumentTypeLabel('Unknown')).toEqual('Unknown')
    })
  })

  describe('getExtractionLevelTranslationKey', () => {
    it('should retrieve the correct extraction level translation key', () => {
      expect(getExtractionLevelTranslationKey(5)).toEqual('facet.level.level_05')
    })

    it('should retrieve the extraction level if no level (1/2)', () => {
      expect(getExtractionLevelTranslationKey('')).toEqual('facet.level.')
    })

    it('should retrieve the extraction level if no level (1/2)', () => {
      expect(getExtractionLevelTranslationKey()).toEqual('')
    })

    it('should retrieve the extraction level for unknown level', () => {
      expect(getExtractionLevelTranslationKey('Unknown')).toEqual('facet.level.Unknown')
    })
  })
})
