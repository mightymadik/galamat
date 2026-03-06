export default {
    routes: [
      {
        method: "POST",
        path: "/auth/sendCode",
        handler: "auth.sendCode",
        config: { auth: false },
      },
      {
        method: "POST",
        path: "/auth/verifyCode",
        handler: "auth.verifyCode",
        config: { auth: false },
      },
    ],
  };
  