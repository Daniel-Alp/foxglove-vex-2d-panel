module.exports = {
  webpack: (config) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    config.module.rules.push({
      test: /\.(png|jpg|jpeg|gif|svg)$/i,
      type: "asset/inline",
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return config;
  },
};
