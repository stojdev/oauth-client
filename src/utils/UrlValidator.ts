export class UrlValidator {
  static isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  static validate(urlString: string, fieldName = 'URL'): void {
    if (!urlString || urlString.trim() === '') {
      throw new Error(`${fieldName} is required`);
    }

    if (!this.isValidUrl(urlString)) {
      throw new Error(`${fieldName} is invalid: ${urlString}`);
    }
  }
}
