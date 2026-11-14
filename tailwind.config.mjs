/** Tailwind motion tokens extracted from the original reference designs. */
export default {
  "theme": {
    "extend": {
      "keyframes": {
        "venture-ring": {
          "0%": {
            "transform": "scale(0.3)",
            "opacity": "0"
          },
          "25%": {
            "opacity": "0.32"
          },
          "65%": {
            "opacity": "0.24"
          },
          "100%": {
            "transform": "scale(1.3)",
            "opacity": "0"
          }
        },
        "bot-float-1": {
          "0%": {
            "transform": "translate(0)"
          },
          "10%": {
            "transform": "translate(5px)"
          },
          "20%": {
            "transform": "translateX(7px) translateY(7px)"
          },
          "30%": {
            "transform": "translateX(13px) translateY(0)"
          },
          "40%": {
            "transform": "translateX(19px) translateY(-5px)"
          },
          "50%": {
            "transform": "translateX(12px) translateY(-10px)"
          },
          "60%": {
            "transform": "translateX(7px) translateY(-17px)"
          },
          "70%": {
            "transform": "translateX(0) translateY(-10px)"
          },
          "80%": {
            "transform": "translateX(-7px) translateY(-5px)"
          },
          "100%": {
            "transform": "translate(0)"
          }
        },
        "bot-float-2": {
          "0%": {
            "transform": "translate(0)"
          },
          "10%": {
            "transform": "translate(-5px)"
          },
          "20%": {
            "transform": "translateX(-10px) translateY(-2px)"
          },
          "30%": {
            "transform": "translateX(-13px) translateY(5px)"
          },
          "40%": {
            "transform": "translateX(-17px) translateY(10px)"
          },
          "50%": {
            "transform": "translateX(-13px) translateY(15px)"
          },
          "60%": {
            "transform": "translateX(-9px) translateY(20px)"
          },
          "70%": {
            "transform": "translateX(-7px) translateY(15px)"
          },
          "80%": {
            "transform": "translateX(-5px) translateY(10px)"
          },
          "90%": {
            "transform": "translateX(0) translateY(5px)"
          },
          "100%": {
            "transform": "translate(0)"
          }
        },
        "bot-float-3": {
          "0%": {
            "transform": "translate(0)"
          },
          "10%": {
            "transform": "translate(8px)"
          },
          "20%": {
            "transform": "translateX(14px) translateY(4px)"
          },
          "30%": {
            "transform": "translateX(12px) translateY(0)"
          },
          "40%": {
            "transform": "translateX(15px) translateY(-6px)"
          },
          "50%": {
            "transform": "translateX(10px) translateY(-12px)"
          },
          "60%": {
            "transform": "translateX(13px) translateY(-17px)"
          },
          "70%": {
            "transform": "translateX(9px) translateY(-22px)"
          },
          "80%": {
            "transform": "translateX(7px) translateY(-15px)"
          },
          "90%": {
            "transform": "translateX(5px) translateY(-10px)"
          },
          "100%": {
            "transform": "translate(0)"
          }
        },
        "bot-float-4": {
          "0%": {
            "transform": "translate(0)"
          },
          "10%": {
            "transform": "translate(5px)"
          },
          "20%": {
            "transform": "translateX(5px) translateY(5px)"
          },
          "30%": {
            "transform": "translateX(0) translateY(10px)"
          },
          "40%": {
            "transform": "translateX(-5px) translateY(5px)"
          },
          "50%": {
            "transform": "translateX(1px) translateY(0)"
          },
          "60%": {
            "transform": "translateX(8px) translateY(-5px)"
          },
          "70%": {
            "transform": "translateX(13px) translateY(-10px)"
          },
          "80%": {
            "transform": "translateX(7px) translateY(-5px)"
          },
          "90%": {
            "transform": "translateX(5px) translateY(0)"
          },
          "100%": {
            "transform": "translate(0)"
          }
        },
        "bot-circle": {
          "0%": {
            "width": "50px",
            "height": "50px",
            "opacity": "0"
          },
          "25%": {
            "width": "100px",
            "height": "100px",
            "opacity": ".5"
          },
          "50%": {
            "width": "150px",
            "height": "150px",
            "opacity": ".3"
          },
          "75%": {
            "width": "200px",
            "height": "200px",
            "opacity": ".3"
          },
          "100%": {
            "width": "250px",
            "height": "250px",
            "opacity": "0"
          }
        }
      },
      "animation": {
        "venture-ring-one": "venture-ring 6s -4s infinite linear",
        "venture-ring-two": "venture-ring 6s -2s infinite linear",
        "venture-ring-three": "venture-ring 6s infinite linear",
        "bot-float-1": "bot-float-1 6s linear infinite alternate",
        "bot-float-2": "bot-float-2 6s linear infinite alternate",
        "bot-float-3": "bot-float-3 6s linear infinite alternate",
        "bot-float-4": "bot-float-4 6s linear infinite alternate",
        "bot-circle-one": "bot-circle 6s 1s infinite linear",
        "bot-circle-two": "bot-circle 6s 3s infinite linear"
      }
    }
  }
};
