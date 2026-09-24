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
    {
        id: 'whisky-tour',
        label: 'Whisky tour',
        description: 'Booking and joining a guided whisky distillery tour.',
    },
    {
        id: 'haircut',
        label: 'Haircut',
        description: 'Getting a haircut at a hair salon.',
    },
    {
        id: 'train-station',
        label: 'Train station',
        description: 'Buying tickets and navigating a train station.',
    },
    {
        id: 'tennis-class',
        label: 'Tennis class',
        description: 'Attending a tennis lesson.',
    },
    {
        id: 'restaurant-recommendations',
        label: 'Restaurant recommendations',
        description: 'Asking for and discussing restaurant recommendations.',
    },
    {
        id: 'custom-pillow-appointment',
        label: 'Custom pillow appointment',
        description: 'A fitting appointment for a custom-made pillow.',
    },
];
