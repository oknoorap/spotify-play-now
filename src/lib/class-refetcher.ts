import { error } from "../utils/logger";

interface IRefetcher {
  info: any;
  lastFetchTime: number;
  isFetchError: boolean;
  isFetching: boolean;
  refetchPolicy: (time: number) => boolean;
}

class Refetcher implements IRefetcher {
  info: any;

  lastFetchTime = Date.now();

  isFetchError = false;

  isFetching = false;

  refetchPolicy = (time: number) => false;

  setInfo(info: any) {
    this.info = info;
  }

  resetFetchTime() {
    this.lastFetchTime = Date.now();
  }

  setFetchingStatus(isFetching: boolean) {
    this.isFetching = isFetching;
  }

  setFetchingErrorStatus(isFetchError: boolean) {
    this.isFetchError = isFetchError;
  }

  setRefetchPolicy(refetchPolicy: (time: number) => boolean) {
    this.refetchPolicy = refetchPolicy;
  }

  async run(callback: () => Promise<void>, periodicRefetch?: number) {
    const fetching = async () => {
      this.setFetchingStatus(true);
      this.resetFetchTime();

      try {
        await callback();
        this.setFetchingErrorStatus(false);
      } catch (err) {
        error(err.message);
        this.setInfo(undefined);
        this.setFetchingErrorStatus(true);
      } finally {
        this.setFetchingStatus(false);
      }
    };

    setInterval(async () => {
      const now = Date.now();

      if (!this.info) {
        const timelapsed = Math.ceil((now - this.lastFetchTime) / 1000);
        if (!this.isFetching && this.isFetchError && timelapsed === 30) {
          await fetching();
        }
        return;
      }

      if (!this.isFetching && this.refetchPolicy(now)) {
        await fetching();
      }
    }, 1000);

    if (periodicRefetch) {
      setInterval(async () => {
        const now = Date.now();

        if (!this.info) {
          const timelapsed = Math.ceil((now - this.lastFetchTime) / 1000);
          if (!this.isFetching && this.isFetchError && timelapsed === 30) {
            await fetching();
          }
          return;
        }

        if (!this.isFetching) {
          await fetching();
        }
      }, periodicRefetch);
    }

    await callback();
  }
}

export default Refetcher;
