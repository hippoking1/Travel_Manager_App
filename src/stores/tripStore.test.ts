import { describe, it, expect, beforeEach } from 'vitest';
import { useTripStore } from './tripStore';

describe('tripStore addDay and deleteDay with backlog options', () => {
  beforeEach(() => {
    useTripStore.getState().resetItineraryToDemo();
  });

  it('addDay increases day count and returns created day id', () => {
    const initialDays = useTripStore.getState().itinerary.length;
    const newDayId = useTripStore.getState().addDay();

    expect(newDayId).toBeTruthy();
    const updatedItinerary = useTripStore.getState().itinerary;
    expect(updatedItinerary.length).toBe(initialDays + 1);

    const addedDay = updatedItinerary.find((d) => d.id === newDayId);
    expect(addedDay).toBeDefined();
    expect(addedDay?.day).toBe(initialDays + 1);
    expect(useTripStore.getState().config.totalDays).toBe(initialDays + 1);
  });

  it('deleteDay with moveToBacklog: true transfers activities to backlog', () => {
    const state = useTripStore.getState();
    const targetDay = state.itinerary[1]; // Day 2
    expect(targetDay.timeBlocks.length).toBeGreaterThan(0);
    const activityCount = targetDay.timeBlocks.length;
    const initialBacklogCount = state.backlog.length;

    state.deleteDay(targetDay.id!, { moveToBacklog: true });

    const updatedState = useTripStore.getState();
    // Day should be removed
    expect(updatedState.itinerary.find((d) => d.id === targetDay.id)).toBeUndefined();
    // Backlog should receive the activities
    expect(updatedState.backlog.length).toBe(initialBacklogCount + activityCount);
    // Transferred items should have cleared time fields
    const transferred = updatedState.backlog.slice(initialBacklogCount);
    expect(transferred[0].startTime).toBeUndefined();
    expect(transferred[0].endTime).toBeUndefined();
  });

  it('deleteDay with moveToBacklog: false discards activities without adding to backlog', () => {
    const state = useTripStore.getState();
    const targetDay = state.itinerary[1]; // Day 2
    const initialBacklogCount = state.backlog.length;

    state.deleteDay(targetDay.id!, { moveToBacklog: false });

    const updatedState = useTripStore.getState();
    expect(updatedState.itinerary.find((d) => d.id === targetDay.id)).toBeUndefined();
    expect(updatedState.backlog.length).toBe(initialBacklogCount);
  });

  it('renumbers remaining days after deleting a day in the middle', () => {
    const state = useTripStore.getState();
    const initialCount = state.itinerary.length;
    const day2Id = state.itinerary[1].id;

    state.deleteDay(day2Id!);

    const updatedItinerary = useTripStore.getState().itinerary;
    expect(updatedItinerary.length).toBe(initialCount - 1);
    // Verify each day number matches its index + 1
    updatedItinerary.forEach((d, idx) => {
      expect(d.day).toBe(idx + 1);
    });
  });
});
