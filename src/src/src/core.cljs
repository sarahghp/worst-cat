(ns src.core
  (:require [reagent.core :as reagent :refer [atom]]))

(enable-console-print!)

(println "Loaded.")

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;; DRAW MANY CUBES ;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; --------------- get context and program ---------------
(def canvas (.getElementById js/document "c"))
(def gl (js/initGL canvas))
;(def program (js/createProgramFromScripts gl "3d-vertex-shader" "3d-fragment-shader"))

(def width (.-canvas.clientWidth gl))
(def height (.-canvas.clientHeight gl))

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

(def program {
    :name "program",
    :type "program",
    :data (js/createProgramFromScripts gl "3d-vertex-shader" "3d-fragment-shader")})

(def position-01 {
  :type         "attribute"
  :shaderVar    "a_position"
  :name         "positionOne"
  :data         (js/Float32Array. vertices-01)
  :pointer      [3, gl.FLOAT, false, 0, 0]
  :rerender     true })

(def position-02 {
  :type         "attribute"
  :shaderVar    "a_position"
  :name         "positionTwo"
  :data         (js/Float32Array. vertices-02)
  :pointer      [3, gl.FLOAT, false, 0, 0]
  :rerender     true })

(def cube-vertex-index {
  :type         "element_arr"
  :name         "e_indices"
  :data         (js/Uint16Array. cube-indices)})

(def transform-mat {
  :type       "uniform"
  :name       "u_matrix"
  :shaderVar  "u_matrix"
  :data       []
  :dataType   "uniformMatrix4fv"
  :rts        {}
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
       (map normalize)))

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

;; --------------- sequence generation -----------------

(defn select-position []
   (if (< 0.5 (rand))
       position-01
       position-02 ))

(defn gen-transforms []
  { :translation [(rand width) (rand height) (rand 40)]
    :rotation    { :x (rand 7.28) :y (rand 7.28) :z 1 }
    :scale       [1 1 1] })

(defn gen-trans-matrix
  [{ :keys [ rotation translation scale ]}]
  (let
    [ translate (partial js/window.m4.translate translation)
      x-rotate  (partial js/window.m4.xRotate (rotation :x))
      y-rotate  (partial js/window.m4.yRotate (rotation :y))
      z-rotate  (partial js/window.m4.zRotate (rotation :z))
      do-scale  (partial js/window.m4.scale scale)]

    (->>  (js/window.m4.projection width height 400)
          translate
          x-rotate
          y-rotate
          z-rotate
          do-scale)))

(defn gen-sequence []
  (let [transforms-map (gen-transforms)]
    [ (select-position)
      cube-vertex-index
      (replace
        { :data [false (gen-trans-matrix transforms-map)]
          :rts  transforms-map }
        transform-mat )
      color
      draw ]))
  (gen-sequence)

(def draw-list (atom
  [(take 100 (repeatedly gen-sequence))]
 ))

;; --------------- animation code -----------------


(defn update-trans-matrix
  [{ data :data, { :keys [x y z] :as rts } :rts :as transform-mat }]

  (let [ updated-rts
    (replace
      { :x (#(+ .01 %) x)
        :y (#(+ .01 %) y)
        :z (#(+ .01 %) z) }
      rts )]

      (replace
        {(count data) (gen-trans-matrix updated-rts)}
        data)))

(defn update-sequence
  [sequence] ;; sequence is the de-refed list
  ( map
    (fn [seq] ;; seq is one element
      (if-not (= (:name seq) "u_matrix")
        seq
        (update-trans-matrix seq)))
    sequence))

(defn animate-cube [gl sequence]
  (let [updated-seq (update-sequence sequence)]
    (js/clear gl)
    (render gl updated-seq)
    (js/requestAnimationFrame (animate-cube gl updated-seq))))



;; write out fns an then do a compositional sequence again
;; generate array of transformations & separate positionings (outside main fn)
;; update rotation on each & generate full transform data & objects
;; interleave with other maps, including one cube or the other (vertex variations)
;; (use an atom tree in here)
;; call requestAnimationFrame

;; use reagent to render & watch? maybe as v2; just use rAF for now

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
