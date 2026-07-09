export interface IAppError extends Error {
  status?: number;
  errors?: string[];
}

const notFound = (msg = "Resource not found"): IAppError => {
  const error: IAppError = new Error(msg);
  error.status = 404;
  return error;
};

const badRequest = (msg = "Bad Request"): IAppError => {
  const error: IAppError = new Error(msg);
  error.status = 400;
  return error;
};

const serverError = (msg = "Internal Server Error"): IAppError => {
  const error: IAppError = new Error(msg);
  error.status = 500;
  return error;
};

const authenticationError = (msg = "Authentication Failed"): IAppError => {
  const error: IAppError = new Error(msg);
  error.status = 401;
  return error;
};

const authorizationError = (msg = "Permission Denied"): IAppError => {
  const error: IAppError = new Error(msg);
  error.status = 403;
  return error;
};

export {
  notFound,
  badRequest,
  serverError,
  authenticationError,
  authorizationError,
};
