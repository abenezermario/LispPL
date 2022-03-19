$(function () {
  $(function () {
    meta.edit({
      combo: [16],
      fake: 16,
      on: async function (e) {
        $(".key-none").removeClass("key-none");
      },
    });
  });
  var joy = (window.JOY = function () {});

  joy.key = function () {
    return gun.user()._.sea;
  };

  joy.typeWritter = function (txtElement, words, cb, opt) {
    var typeWritter = {};
    var opt = opt || {
      typeSpeed: 300,
      backSpeed: 100,
    };

    typeWritter.txtElement = txtElement;
    typeWritter.words = words;
    typeWritter.wait = opt.typeSpeed;
    typeWritter.wordIndex = 0;
    typeWritter.isDeleting = false;
    typeWritter.typeSpeed = opt.typeSpeed;
    typeWritter.txt = "";
    // typeWritter.typeSpeed = 200 || typeWritter.wait;
    typeWritter.type = function () {
      // Current index of word
      var current = typeWritter.wordIndex;
      const fullTxt = typeWritter.words[current];
      console.log("fullTxt: ", fullTxt);
      // Check if Deleting

      if (typeWritter.isDeleting) {
        // Remove char
        typeWritter.txt = fullTxt.substring(0, typeWritter.txt.length - 1);
        typeWritter.typeSpeed = opt.backSpeed;
      } else {
        // ADD char
        typeWritter.txt = fullTxt.substring(0, typeWritter.txt.length + 1);
        typeWritter.typeSpeed = opt.typeSpeed;
        console.log("backSpeed: ", opt.backSpeed);
        console.log("typeSpeed: ", opt.typeSpeed);
      }

      // Insert txt into element
      typeWritter.txtElement.innerHTML = `<span class="txt">${typeWritter.txt}</span>`;
      // Init Type speed
      // let typeSpeed = 200;

      // If word is complete
      if (!typeWritter.isDeleting && typeWritter.txt === fullTxt) {
        if (typeWritter.wordIndex + 1 == typeWritter.words.length) {
          typeWritter.isDeleting = false;
          cb();
          return;
        }
        // Make pause at end
        typeWritter.typeSpeed = typeWritter.wait;

        console.log(typeWritter.typeSpeed);
        // Set delete to true
        typeWritter.isDeleting = true;
      } else if (typeWritter.isDeleting && typeWritter.txt === "") {
        typeWritter.isDeleting = false;
        // Move to next word
        console.log("endWordIndex: ", typeWritter.wordIndex);
        typeWritter.wordIndex++;
        // Pause before start typing
      }
      // wave(typeWritter.txt).play();

      setTimeout(() => typeWritter.type(), typeWritter.typeSpeed);
    };

    return typeWritter;
  };
  joy.icon = function (name, type, kbd) {
    return `
		<div style='display:flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 0.75em;'>
			<p class='key-none'><kbd>${kbd}</kbd></p>
			<i class="fa-${type || "regular"} fa-${name}"></i>
		</div>`;
  };
  joy.auth = function (k, cb, o) {
    if (!o) {
      o = cb;
      cb = 0;
    }
    if (o === true) {
      SEA.pair().then((key) => {
        JOY.auth(key);
        gun.user().get("profile").get("name").put(k);
        // gun.user().get("profile").get("name").put(k);
        if (cb) {
          cb(key);
        }
      });
      return;
    }
    var k = k || joy.key();
    console.log("auth", k);
    localStorage.setItem("user-key", JSON.stringify(k));
    gun.user().auth(k, cb, o);
  };
  joy.include = function (id, filename, status) {
    if (status == "on") {
      var head = document.getElementsByTagName("head")[0];
      script = document.createElement("script");
      script.src = filename;
      script.type = "text/javascript";
      script.id = id;

      head.appendChild(script);
    } else {
      (elem = document.getElementById(id)).parentNode.removeChild(elem);
    }
  };

  var opt = (joy.opt = window.CONFIG || {}),
    peers;
  $("link[type=peer]").each(function () {
    (peers || (peers = [])).push($(this).attr("href"));
  });

  !window.gun &&
    (opt.peers =
      opt.peers ||
      peers ||
      (function () {
        (console.warn || console.log)(
          "Warning: No peer provided, defaulting to DEMO peer. Do not run in production, or your data will be regularly wiped, reset, or deleted. For more info, check https://github.com/eraeco/joydb#peers !"
        );
        return [
          // "http://localhost:8765/gun",
          "https://marda.herokuapp.com/gun",
        ];
      })());
  window.gun = window.gun || Gun(opt);

  gun.on("auth", async function (ack) {
    if (!ack.err) {
      //
    } else {
      console.log("Login Failed");
    }
    console.log("Your namespace is publicly available at", ack.soul);
    $(function () {
      if (JOY.paper) {
        console.log(JOY.paper);
      }
    });
  });

  if (localStorage.getItem("user-key")) {
    var key = localStorage.getItem("user-key");
    JOY.auth(JSON.parse(key));
    // location.href = location.origin + "/home/";
  } else {
    console.log("NO ACCOUNT");
    $("#username").keypress((e) => {
      var username = $("#username").val();
      if (username.length > 0 && e.which == 13) {
        console.log("username: ", username);

        JOY.auth(
          username,
          (key) => {
            console.log("Key: ", key);
            location.href = location.origin + "/home/";
          },
          true
        );
      }
    });
  }
});
