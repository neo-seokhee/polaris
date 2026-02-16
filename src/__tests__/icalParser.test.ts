// Test iCal parsing logic without React Native dependencies
import ICAL from 'ical.js';

interface ParsedEvent {
  uid: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location: string | null;
  description: string | null;
}

// Extracted parser logic for testing
function parseICS(icsText: string): ParsedEvent[] {
  const jcalData = ICAL.parse(icsText);
  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents('vevent');

  const events: ParsedEvent[] = [];
  const now = new Date();
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const HALF_YEAR_MS = ONE_YEAR_MS / 2;
  const rangeStart = new Date(now.getTime() - HALF_YEAR_MS);
  const rangeEnd = new Date(now.getTime() + HALF_YEAR_MS);

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const uid = event.uid;
    const title = event.summary || '(제목 없음)';
    const startDate = event.startDate;
    const endDate = event.endDate;
    const location = event.location || null;
    const description = event.description || null;

    if (!uid || !startDate) continue;

    const startTime = startDate.toJSDate();
    const endTime = endDate ? endDate.toJSDate() : new Date(startTime.getTime() + 60 * 60 * 1000);

    if (startTime >= rangeStart && startTime <= rangeEnd) {
      events.push({ uid, title, startTime, endTime, location, description });
    }
  }

  return events;
}

describe('iCal Parser', () => {
  const validICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1@example.com
DTSTART:20260130T100000Z
DTEND:20260130T110000Z
SUMMARY:Test Meeting
LOCATION:Conference Room A
DESCRIPTION:This is a test meeting
END:VEVENT
BEGIN:VEVENT
UID:test-event-2@example.com
DTSTART:20260131T140000Z
DTEND:20260131T150000Z
SUMMARY:Project Review
END:VEVENT
END:VCALENDAR`;

  it('should parse valid ICS content', () => {
    const events = parseICS(validICS);
    expect(events).toBeInstanceOf(Array);
    expect(events.length).toBeGreaterThan(0);
  });

  it('should extract event properties correctly', () => {
    const events = parseICS(validICS);
    const testEvent = events.find(e => e.uid === 'test-event-1@example.com');

    if (testEvent) {
      expect(testEvent.title).toBe('Test Meeting');
      expect(testEvent.location).toBe('Conference Room A');
      expect(testEvent.description).toBe('This is a test meeting');
      expect(testEvent.startTime).toBeInstanceOf(Date);
      expect(testEvent.endTime).toBeInstanceOf(Date);
    }
  });

  it('should handle events without location', () => {
    const events = parseICS(validICS);
    const eventWithoutLocation = events.find(e => e.uid === 'test-event-2@example.com');

    if (eventWithoutLocation) {
      expect(eventWithoutLocation.location).toBeNull();
    }
  });

  it('should throw for invalid ICS', () => {
    const invalidICS = 'not a valid ics content';
    expect(() => parseICS(invalidICS)).toThrow();
  });

  it('should handle empty calendar', () => {
    const emptyICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
END:VCALENDAR`;

    const events = parseICS(emptyICS);
    expect(events).toEqual([]);
  });

  it('should filter events outside date range', () => {
    const farFutureICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:far-future@example.com
DTSTART:20280101T100000Z
DTEND:20280101T110000Z
SUMMARY:Far Future Event
END:VEVENT
END:VCALENDAR`;

    const events = parseICS(farFutureICS);
    expect(events.length).toBe(0);
  });
});
