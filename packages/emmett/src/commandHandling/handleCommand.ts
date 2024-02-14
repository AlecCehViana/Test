import {
  NO_CHECK,
  STREAM_DOES_NOT_EXISTS,
  type DefaultStreamVersionType,
  type EventStore,
  type ExpectedStreamVersion,
} from '../eventStore';
import type { Event } from '../typing';

// #region command-handler
export const CommandHandler =
  <State, StreamEvent extends Event, StreamVersion = DefaultStreamVersionType>(
    evolve: (state: State, event: StreamEvent) => State,
    getInitialState: () => State,
    mapToStreamId: (id: string) => string = (id) => id,
  ) =>
  async (
    eventStore: EventStore<StreamVersion>,
    id: string,
    handle: (state: State) => StreamEvent | StreamEvent[],
    options?: {
      expectedStreamVersion?: ExpectedStreamVersion<StreamVersion>;
    },
  ) => {
    const streamName = mapToStreamId(id);

    const { state, currentStreamVersion } = await eventStore.aggregateStream<
      State,
      StreamEvent
    >(streamName, {
      evolve,
      getInitialState,
      read: {
        // expected stream version is passed to fail fast
        // if stream is in the wrong state
        expectedStreamVersion: options?.expectedStreamVersion ?? NO_CHECK,
      },
    });

    const result = handle(state ?? getInitialState());

    // Either use:
    // - provided expected stream version,
    // - current stream version got from stream aggregation,
    // - or expect stream not to exists otherwise.
    const expectedStreamVersion: ExpectedStreamVersion<StreamVersion> =
      options?.expectedStreamVersion ??
      currentStreamVersion ??
      STREAM_DOES_NOT_EXISTS;

    return eventStore.appendToStream(
      streamName,
      Array.isArray(result) ? result : [result],
      {
        expectedStreamVersion,
      },
    );
  };
// #endregion command-handler
