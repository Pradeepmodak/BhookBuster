declare module "jsonwebtoken" {
  export interface JwtPayload {
    [key: string]: any;
  }
  const jwt: any;
  export default jwt;
}
