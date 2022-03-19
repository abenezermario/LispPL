$(function () {
  if (JOY.key()) {
    console.log("JOY.key()", JOY.key());
    location.href = location.origin + "/home/";
  }
  meta.edit({
    name: JOY.icon("home", "solid", "H"),
    combo: ["H"],
    on: async function (e) {
      location.href = location.origin + "/home/";
    },
  });
});
