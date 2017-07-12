(ns src.core
  (:require [reagent.core :as reagent :refer [atom]]))

(enable-console-print!)

(println "Loaded.")

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;; DRAW MANY CUBES ;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; --------------- get context and program ---------------
(def canvas (.getElementById js/document "c"))
(def gl (.getContext canvas "webgl"))
(def width (.-canvas.clientWidth gl))
(def height (.-canvas.clientHeight gl))
(def program (js/createProgramFromScripts gl "3d-vertex-shader" "3d-fragment-shader"))

;; --------------- basic data structures -----------------

(def vertices-01 [
  ;; Front face
  0.0    0.0    100.0
  100.0  0.0    100.0
  100.0  100.0  100.0
  0.0    100.0  100.0

  ;; Back face
  0.0    0.0    0.0
  0.0    100.0  0.0
  100.0  100.0  0.0
  100.0  0.0    0.0

  ;; Top face
  0.0    100.0  0.0
  0.0    100.0  100.0
  100.0  100.0  100.0
  100.0  100.0  0.0

  ;; Bottom face
  0.0    0.0    0.0
  100.0  0.0    0.0
  100.0  0.0    100.0
  0.0    0.0    100.0

  ;; Right face
  100.0    0.0  0.0
  100.0  100.0  0.0
  100.0  100.0  100.0
  100.0    0.0  100.0

  ;; Left face
  0.0    0.0    0.0
  0.0    0.0    100.0
  0.0  100.0    100.0
  0.0  100.0    0.0])

(def vertices-02 [
  ;; Front face
  0.0,    0.0,    50.0,
  100.0,  0.0,    50.0,
  100.0,  100.0,  100.0,
  0.0,    100.0,  100.0,

  ;; Back face
  0.0,      0.0,  0.0,
  0.0,    100.0,  0.0,
  50.0,    50.0,  0.0,
  100.0,    0.0,  0.0,

  ;; Top face
  0.0,    100.0,  0.0,
  0.0,    100.0,  100.0,
  100.0,  100.0,  100.0,
  100.0,  100.0,  0.0,

  ;; Bottom face
  0.0,    0.0,    0.0,
  100.0,  0.0,    0.0,
  100.0,  0.0,    100.0,
  0.0,    0.0,    100.0,

  ;; Right face
  100.0,    0.0,  0.0,
  50.0,    50.0,  0.0,
  100.0,  100.0,  100.0,
  100.0,    0.0,  100.0,

  ;; Left face
  0.0,    0.0,    0.0,
  0.0,    0.0,    100.0,
  0.0,   50.0,    50.0,
  0.0,  100.0,    0.0])

(def cube-indices [
  0,  1,  2,      0,  2,  3,    ;; front
  4,  5,  6,      4,  6,  7,    ;; back
  8,  9,  10,     8,  10, 11,   ;; top
  12, 13, 14,     12, 14, 15,   ;; bottom
  16, 17, 18,     16, 18, 19,   ;; right
  20, 21, 22,     20, 22, 23 ]) ;; left

;; --------------- worst-cat data structures -----------------

(def positionOne {
  :type         "attribute"
  :shaderVar    "a_position"
  :name         "positionOne"
  :data         (js/Float32Array. vertices-01)
  :pointer      [3, gl.FLOAT, false, 0, 0]
  :rerender     true })

(def positionTwo {
  :type         "attribute"
  :shaderVar    "a_position"
  :name         "positionTwo"
  :data         (js/Float32Array. vertices-02)
  :pointer      [3, gl.FLOAT, false, 0, 0]
  :rerender     true })

(def cubeVertexIndex {
  :type         "element_arr"
  :name         "e_indices"
  :data         (js/Uint16Array. cube-indices)})

(def initialMatrix {
  :translation [(/ width 3) (/ height 3) 40],
  :rotation    [1, 1, 1],
  :scale       [1, 1, 1],
})

(def transformMatrix {
  :type       "uniform"
  :name       "u_matrix"
  :shaderVar  "u_matrix"
  :data       []
  :dataType   "uniformMatrix4fv"
})

(def base-colors
  [ [255,  240,  85,   255]
    [146,  149,  152,  255]
    [12,   182,  145,  255]
    [255,    0,  72,   255]
    [185,  119,  211,  255]
    [255,  137,  147,  255]])

(defn generateColors
  [c-vecs]
  (defn normalize [c]
    (/ c 255))
  (->> c-vecs
       (mapcat #(repeat 4 %))
       flatten
       (map normalize)
       ))

(def color {
  :type       "attribute"
  :name       "a_color"
  :shaderVar  "a_color"
  :data       (js/Float32Array. (generateColors base-colors))
  :pointer    [4, gl.FLOAT, false, 0, 0]})

(def draw {
   :type      "draw"
   :name      "d_draw"
   :drawCall  gl.drawElements
   :data      [gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0]
 })

(println program)
;; define your app data so that it doesn't get over-written on reload

(defonce app-state (atom {:text "Hello world!"}))

(defn hello-world []
  [:h1 (:text @app-state)])

(reagent/render-component [hello-world]
                          (. js/document (getElementById "app")))

(defn on-js-reload []
  ;; optionally touch your app-state to force rerendering depending on
  ;; your application
  ;; (swap! app-state update-in [:__figwheel_counter] inc)
)