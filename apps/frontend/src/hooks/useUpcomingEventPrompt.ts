import {useEffect, useState} from 'react';

/**
 * Detects the next relevant upcoming event within 24 hours
 * and filters by stylistically relevant keywords.
 */
export function useUpcomingEventPrompt(calendarEvents: any[]) {
  const [upcomingEvent, setUpcomingEvent] = useState<any | null>(null);

  useEffect(() => {
    if (!calendarEvents?.length) return;

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Define style-relevant keywords
    const keywords = [
      'dinner',
      'party',
      'drinks',
      'event',
      'meeting',
      'wedding',
      'date',
      'conference',
      'launch',
      'show',
      'gala',
      'ceremony',
      'fashion',
      'art',
    ];

    // Find next event in 24h that matches keywords
    const next = calendarEvents.find(ev => {
      const start = new Date(ev.start_date);
      const title = ev.title?.toLowerCase() || '';
      const isRelevant = keywords.some(word => title.includes(word));
      return start > now && start < in24h && isRelevant;
    });

    if (next) {
      setUpcomingEvent(next);
    } else {
      setUpcomingEvent(null);
    }
  }, [calendarEvents]);

  return upcomingEvent;
}

//////////////////

// // src/hooks/useUpcomingEventPrompt.ts
// import {useEffect, useState} from 'react';

// export function useUpcomingEventPrompt(calendarEvents: any[]) {
//   const [upcomingEvent, setUpcomingEvent] = useState<any | null>(null);

//   useEffect(() => {
//     if (!calendarEvents?.length) return;

//     const now = new Date();
//     const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

//     // find the next event in the next 24 hours
//     const next = calendarEvents.find(ev => {
//       const start = new Date(ev.start_date);
//       return start > now && start < in24h;
//     });

//     if (next) setUpcomingEvent(next);
//   }, [calendarEvents]);

//   return upcomingEvent;
// }
