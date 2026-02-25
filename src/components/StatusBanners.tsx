import React from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { OfflineBanner } from '@/components/OfflineBanner';

export function StatusBanners() {
    return (
        <>
            <DemoBanner />
            <OfflineBanner />
        </>
    );
}
