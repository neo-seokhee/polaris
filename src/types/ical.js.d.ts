declare module 'ical.js' {
    export function parse(input: string): any[];

    export class Component {
        constructor(jCal: any[] | string, parent?: Component);
        getAllSubcomponents(name?: string): Component[];
        getFirstSubcomponent(name?: string): Component | null;
        getFirstPropertyValue(name: string): any;
    }

    export class Event {
        constructor(component?: Component, options?: { strictExceptions?: boolean; exceptions?: Event[] });
        readonly uid: string;
        readonly summary: string;
        readonly description: string;
        readonly location: string;
        readonly startDate: Time;
        readonly endDate: Time;
        isRecurring(): boolean;
        iterator(startTime?: Time): RecurExpansion;
    }

    export class Time {
        constructor(data?: { year?: number; month?: number; day?: number; hour?: number; minute?: number; second?: number; isDate?: boolean });
        toJSDate(): Date;
        compare(other: Time): number;
        static fromJSDate(date: Date, useUTC?: boolean): Time;
        static now(): Time;
    }

    export class RecurExpansion {
        next(): Time | null;
    }
}
