import type { ScenarioMeta } from '../types';

// Order here also defines the default scenario picker order.
export const scenarios: ScenarioMeta[] = [
    {
        id: 'restaurant',
        label: 'Restaurant',
        description: 'Order food and interact with restaurant staff.',
    },
    {
        id: 'shop',
        label: 'Shop',
        description: 'Browse and buy items at a shop.',
    },
    {
        id: 'greetings',
        label: 'Greetings',
        description: 'Everyday greetings and small talk.',
    },
    {
        id: 'plane',
        label: 'Plane',
        description: 'Conversations you might have onboard a flight.',
    },
    {
        id: 'airport',
        label: 'Airport',
        description: 'Checking in and getting through the airport.',
    },
    {
        id: 'hotel',
        label: 'Hotel',
        description: 'Checking in and out of a hotel.',
    },
];
