declare module 'bcryptjs' {
  export function hash(
    s: string,
    salt: string | number,
    callback?: (err: Error, hash: string) => void
  ): Promise<string>;
  export function hashSync(s: string, salt: string | number): string;
  export function compare(
    s: string,
    hash: string,
    callback?: (err: Error, success: boolean) => void
  ): Promise<boolean>;
  export function compareSync(s: string, hash: string): boolean;
  export function genSalt(
    rounds?: number,
    callback?: (err: Error, salt: string) => void
  ): Promise<string>;
  export function genSaltSync(rounds?: number): string;
}
