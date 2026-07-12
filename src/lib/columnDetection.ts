export interface ColumnMapping {
  phone: string;
  name: string;
  message: string;
}

const PHONE_PATTERNS = [
  /phone/i, /mobile/i, /رقم/i, /هاتف/i, /جوال/i, /موبايل/i, /tel/i, /cell/i
];

const NAME_PATTERNS = [
  /name/i, /اسم/i, /إسم/i, /مشترك/i, /عميل/i, /customer/i, /client/i
];

const MESSAGE_PATTERNS = [
  /message/i, /sms/i, /رسالة/i, /نص/i, /text/i, /msg/i, /content/i
];

export const detectColumnType = (header: string): 'phone' | 'name' | 'message' | null => {
  const normalizedHeader = header.toLowerCase().replace(/[_-]/g, '');

  if (PHONE_PATTERNS.some(pattern => pattern.test(normalizedHeader))) {
    return 'phone';
  }
  if (NAME_PATTERNS.some(pattern => pattern.test(normalizedHeader))) {
    return 'name';
  }
  if (MESSAGE_PATTERNS.some(pattern => pattern.test(normalizedHeader))) {
    return 'message';
  }
  return null;
};

export const autoDetectColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = { phone: '', name: '', message: '' };

  headers.forEach((header) => {
    const type = detectColumnType(header);
    if (type && !mapping[type]) {
      mapping[type] = header;
    }
  });

  return mapping;
};
