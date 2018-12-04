export default function error(
  code: string,
  message: string,
  additional?: object
) {
  return {
    error: {
      message,
      code,
      ...additional
    }
  };
}
