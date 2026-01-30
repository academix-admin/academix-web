export interface PinData  {
    inUse: boolean;
    action: (pin: string) => Promise<void>;
}