(ns worst_cat.core)

(def reconciler (atom {}))
(def current-program (atom {}))
(def prev-list (atom {}))


;; --------------- test fns -----------------

(defn is-new?
  [{ :keys [name] }]
  (not (contains? @reconciler name)))

;; this version uses deep equality on the whole comp (=)
#_(defn has-changed?
  [{ :keys [name re-render] :as comp }]
  (or re-render (not (= (@reconciler name) comp ))))

;; this version uses the data equality test & is rather faster
(defn has-changed?
  [{ :keys [name re-render] :as comp }]
  (or re-render (not (= (get-in @reconciler [name :data]) (comp :data) ))))

;; ---------- gl binding & call fns ---------------
;; moved js versions of these
;; to helpers if this is too annoying to manage

#_(defn bind-set-array
  [{:keys [data pointer]} gl buffer-type]

  (let [buffer (.createBuffer gl)]
    (.bindBuffer buffer-type buffer)
    (.bufferData buffer-type data gl.STATIC_DRAW))

    (when (= buffer-type (-.ARRAY_BUFFER gl))
      (.vertexAttribPointer.apply gl pointer)))

#_(defn set-uniform
  [{ :keys [data-with-location data-type]}, gl]
  (.apply (data-type gl) gl data-with-location))

;; --------------- processing fns -----------------

(defn bind-program
  [{ :keys [type name data] :as comp}, gl]

  (when-not (= @current-program data)
    (reset! current-program data)
    (.useProgram gl data)
    { name comp }))

(defn render-attribute
  [{ :keys [name shader-var data] :as comp}, gl]

  (when (has-changed? comp)
    (let [program @current-program
          location
            (or
              (get-in @reconciler [name :location])
              (.getAttribLocation gl program shader-var))
          updated-pointer (into [location] (comp :pointer))
          updated-comp (assoc comp :pointer updated-pointer :location location)] ; change these to assoc

      (when (is-new? comp)
        (.enableVertexAttribArray gl location))

      (js/bindAndSetArray data (into-array updated-pointer) gl (.-ARRAY_BUFFER gl))
      { name updated-comp })))

(defn render-uniform
  [{ :keys [name shader-var data data-type] :as comp}, gl]

  (when (has-changed? comp)
    (let [program @current-program
          location
            (or
              (get-in @reconciler [name :location])
              (.getUniformLocation gl program shader-var))
          data-with-location (conj data location)
          updated-comp (assoc comp :location location :data-with-location data-with-location )]

    (js/setUniform (into-array data-with-location) data-type gl)
    { name updated-comp })))

(defn render-element-arr
  [{ :keys [name shader-var data data-type] :as comp}, gl]

  (when (has-changed? comp)
    (let [program @current-program
          location
            (or
              (get-in @reconciler [name :location])
              (.getUniformLocation gl program shader-var))
          updated-comp (assoc comp :location location )]

          (js/bindAndSetArray data data-type gl (.-ELEMENT_ARRAY_BUFFER gl))
          { name updated-comp })))

(defn draw-it
  [{:keys [data draw-call] :as comp } gl]
  (js/drawIt draw-call (into-array data) gl)
  nil)

;; this one means we have to do a lot more shenanigans to get apply working
#_(defn draw-it
  [{:keys [data draw-call] :as comp } gl]
  (.apply (aget gl draw-call) gl (into-array data))
  nil)

;; --------------- reconciler -----------------

(defn process
  [gl {:keys [type] :as comp}]
  (cond
    (identical? type "program")      (bind-program comp gl) ;; identical over = for speeeeeed
    (identical? type "attribute")    (render-attribute comp gl)
    (identical? type "uniform")      (render-uniform comp gl)
    (identical? type "element_arr")  (render-element-arr comp gl)
    (identical? type "draw")         (draw-it comp gl)
    :else (.error js/console "Cannot render component of type:" type)))

(defn update-reconciler
  [updates]

  (->>  updates
        (remove nil?)
        (into @reconciler) ;; into is fast
        (reset! reconciler)))

(defn map-and-set-list
  [gl list]
  (reset! prev-list list)
  (map (partial process gl) list))

(defn render
  [gl components]
  (let
    [ updated-components
      (if-not (identical? @prev-list components)
        (map-and-set-list gl components)
        []) ]
    (update-reconciler updated-components)))
