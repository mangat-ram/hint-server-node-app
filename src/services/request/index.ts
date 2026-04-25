import { Request } from "express";
import { IUser } from "../../api/user/model";

export interface AuthorizedRequest extends Request {
  user: IUser;
}

export interface ParameterizedRequest<T = any> extends Request<T> {
  params: T;
}

export interface QueryParameterizedRequest<T = any> extends Request<any, any, any, T> {
  query: T;
}