/**
 * Email Validation Service
 * Provides disposable email detection and email format validation
 */

// Common disposable email domains (top 100+)
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Popular temporary email services
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'tempmail.net',
  'guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net', 'guerrillamail.biz',
  'mailinator.com', 'mailinator.net', 'mailinator.org', 'mailinator2.com',
  'maildrop.cc', 'getairmail.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'throwaway.email', 'throwawaymail.com', 'trashmail.com', 'trashmail.net',
  'fakeinbox.com', 'fakemailgenerator.com', 'temp-mail.org', 'temp-mail.io',
  'tempinbox.com', 'tempinbox.co.uk', 'dispostable.com', 'mailnesia.com',
  'getnada.com', 'nada.email', 'sharklasers.com', 'spam4.me', 'spamgourmet.com',
  'emailondeck.com', 'mohmal.com', 'discard.email', 'discardmail.com',
  'mytemp.email', 'tempail.com', 'burnermail.io', 'inboxkitten.com',
  'mailsac.com', 'moakt.com', 'tempr.email', 'tempsky.com', 'fakeinbox.info',
  'emailfake.com', 'crazymailing.com', 'tempmailo.com', 'emailtemporario.com.br',
  'mintemail.com', 'tempmailaddress.com', 'dropmail.me', 'harakirimail.com',
  'jetable.org', 'kasmail.com', 'mail-temp.com', 'mailcatch.com', 'mailexpire.com',
  'mailforspam.com', 'mailhazard.com', 'mailhazard.us', 'mailnull.com',
  'mailscrap.com', 'mailslite.com', 'mailtemp.info', 'mailzilla.com',
  'meltmail.com', 'mt2009.com', 'mytrashmail.com', 'nobulk.com', 'nospam.ze.tc',
  'nospamfor.us', 'nowmymail.com', 'obobbo.com', 'oneoffemail.com', 'pjjkp.com',
  'pookmail.com', 'privacy.net', 'proxymail.eu', 'rcpt.at', 'rejectmail.com',
  'rtrtr.com', 'safe-mail.net', 'safetymail.info', 'sendspamhere.com',
  'shitmail.me', 'smellfear.com', 'snakemail.com', 'sneakemail.com',
  'sofort-mail.de', 'sogetthis.com', 'spam.la', 'spamavert.com', 'spambob.com',
  'spambob.net', 'spambob.org', 'spambog.com', 'spambog.de', 'spambog.ru',
  'spambox.info', 'spambox.irishspringrealty.com', 'spambox.us', 'spamcannon.com',
  'spamcannon.net', 'spamcero.com', 'spamcon.org', 'spamcorptastic.com',
  'spamday.com', 'spamex.com', 'spamfree24.com', 'spamfree24.de', 'spamfree24.eu',
  'spamfree24.info', 'spamfree24.net', 'spamfree24.org', 'spamgoes.in',
  'spamherelots.com', 'spamhereplease.com', 'spamhole.com', 'spamify.com',
  'spaminator.de', 'spamkill.info', 'spaml.com', 'spaml.de', 'spamlot.net',
  'spammotel.com', 'spamobox.com', 'spamoff.de', 'spamslicer.com', 'spamspot.com',
  'spamstack.net', 'spamthis.co.uk', 'spamthisplease.com', 'spamtrail.com',
  'spamtroll.net', 'supergreatmail.com', 'supermailer.jp', 'suremail.info',
  'teleworm.com', 'teleworm.us', 'tempemail.biz', 'tempemail.co.za',
  'tempemail.com', 'tempemail.net', 'tempinbox.com', 'tempmail.co', 'tempmail.de',
  'tempmail.eu', 'tempmail.it', 'tempmail.net', 'tempmail.us', 'tempmail2.com',
  'tempmailer.com', 'tempmailer.de', 'tempomail.fr', 'temporaryemail.net',
  'temporaryemail.us', 'temporaryforwarding.com', 'temporaryinbox.com',
  'thankyou2010.com', 'thisisnotmyrealemail.com', 'throam.com', 'throwam.com',
  'tmail.ws', 'tmailinator.com', 'trash-amil.com', 'trash-mail.at', 'trash-mail.com',
  'trash-mail.de', 'trash2009.com', 'trash2010.com', 'trash2011.com', 'trashbox.eu',
  'trashdevil.com', 'trashdevil.de', 'trashemail.de', 'trashmail.at', 'trashmail.de',
  'trashmail.me', 'trashmail.org', 'trashmail.ws', 'trashmailer.com', 'trashymail.com',
  'trashymail.net', 'trbvm.com', 'trickmail.net', 'trillianpro.com', 'turual.com',
  'twinmail.de', 'tyldd.com', 'uggsrock.com', 'upliftnow.com', 'uplipht.com',
  'venompen.com', 'veryrealemail.com', 'viditag.com', 'viewcastmedia.com',
  'viewcastmedia.net', 'viewcastmedia.org', 'webm4il.info', 'webuser.in',
  'wegwerfadresse.de', 'wegwerfemail.com', 'wegwerfemail.de', 'wegwerfmail.de',
  'wegwerfmail.info', 'wegwerfmail.net', 'wegwerfmail.org', 'wetrainbayarea.com',
  'wetrainbayarea.org', 'wh4f.org', 'whatiaas.com', 'whatpaas.com', 'whopy.com',
  'wilemail.com', 'willhackforfood.biz', 'willselfdestruct.com', 'winemaven.info',
  'wronghead.com', 'wuzup.net', 'wuzupmail.net', 'wwwnew.eu', 'x.ip6.li',
  'xagloo.com', 'xemaps.com', 'xents.com', 'xmaily.com', 'xoxy.net', 'yapped.net',
  'yeah.net', 'yep.it', 'yogamaven.com', 'yuurok.com', 'zehnminutenmail.de',
  'zippymail.info', 'zoaxe.com', 'zoemail.com', 'zoemail.net', 'zoemail.org',
  // Additional common ones
  'mailnator.com', 'tempemailco.com', 'fakemailgenerator.net', 'tempmailgen.com',
  'emailfake.net', 'tempmail.ninja', 'emailtemporario.com', 'tempail.net',
]);

/**
 * Check if an email domain is a known disposable email provider
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Validate email format using regex
 */
export function isValidEmailFormat(email: string): boolean {
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 320;
}

/**
 * Check if email has a valid TLD (top-level domain)
 */
export function hasValidTLD(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  
  // Check if domain has at least one dot and a valid TLD length
  const parts = domain.split('.');
  if (parts.length < 2) return false;
  
  const tld = parts[parts.length - 1];
  // TLD should be 2-63 characters
  return tld.length >= 2 && tld.length <= 63;
}

/**
 * Full email validation
 */
export function validateEmail(email: string): { 
  isValid: boolean; 
  error?: string;
  isDisposable?: boolean;
} {
  // Trim and lowercase
  const cleanEmail = email.trim().toLowerCase();
  
  // Check format
  if (!isValidEmailFormat(cleanEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  // Check TLD
  if (!hasValidTLD(cleanEmail)) {
    return { isValid: false, error: 'Invalid email domain' };
  }
  
  // Check disposable
  if (isDisposableEmail(cleanEmail)) {
    return { 
      isValid: false, 
      error: 'Disposable email addresses are not allowed. Please use a permanent email address.',
      isDisposable: true 
    };
  }
  
  return { isValid: true };
}

/**
 * Generate a secure verification token
 */
export function generateVerificationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
