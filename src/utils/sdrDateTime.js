const pad = (value) => String(value).padStart(2, '0');

export const formatForDateInput = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const formatForTimeInput = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatForDateTimeLocalInput = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return `${formatForDateInput(date)}T${formatForTimeInput(date)}`;
};

export const appendBrowserTimezoneOffset = (localDateTime) => {
    if (!localDateTime) return '';
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(localDateTime)) return localDateTime;

    const offset = new Date().getTimezoneOffset();
    const sign = offset > 0 ? '-' : '+';
    const absoluteOffset = Math.abs(offset);
    const hours = pad(Math.floor(absoluteOffset / 60));
    const minutes = pad(absoluteOffset % 60);
    const base = localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;

    return `${base}${sign}${hours}:${minutes}`;
};

export const combineDateAndTimeToOffsetIso = (date, time) => {
    if (!date || !time) return '';
    return appendBrowserTimezoneOffset(`${date}T${time}`);
};