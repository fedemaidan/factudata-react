export const getUser = () => {
  const appState = JSON.parse(localStorage.getItem("MY_APP_STATE"));
  return appState?.user?.email;
};
