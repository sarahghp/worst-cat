(ns worst-cat.core)

(defn hello-friend
  []
  "hello from the other file")

(def reconciler (atom {}))
(def prev-list (atom {}))


;; --------------- test fns -----------------

(defn is-new?
  [{:keys [name]}]
  (not (contains? @reconciler name)))

(defn has-changed?
  [{ :keys [name re-render] :as comp }]
  (or re-render (not (= (@reconciler name) comp ))))

;; ---------- gl binding & call fns ---------------
;; might make sense to moce js versions of these
;; to helpers if this is too annoying to manage

#_(defn bind-set-array
  [{:keys [data pointer]} gl buffer-type]

  (let [buffer (.createBuffer gl)]
    (.bindBuffer buffer-type buffer)
    (.bufferData buffer-type data gl.STATIC_DRAW))

    (when (= buffer-type (-.ARRAY_BUFFER gl))
      ;; gl.vertexAttribPointer.apply(gl, component.get('pointer'))
      (.vertexAttribPointer.apply gl pointer)))

#_(defn set-uniform
  [{ :keys [data-with-location data-type]}, gl]
  ;;  gl[component.get('dataType')].apply(gl, component.get('dataWithLocation'))
  (.apply (data-type gl) gl data-with-location))

;; --------------- processing fns -----------------

(defn bind-program
  [{ :keys [type name data] :as comp}, gl]

  (when-not (= (@reconciler :last-used) comp)
    (when (is-new? comp)
      (swap! reconciler #(merge % {:last-used comp})))
    (.useProgram gl data)
    { name comp }))

(defn render-attribute
  [{ :keys [name shader-var data] :as comp}, gl]

  (when (has-changed? comp)
    (let [program (get-in @reconciler [:last-used :data])
          location
            (or
              (get-in @reconciler [name :location])
              (.getAttribLocation gl program shader-var))
          updated-pointer (into [location] (comp :pointer))
          updated-comp (merge comp {:pointer updated-pointer :location location })]

      (when (is-new? comp)
        (.enableVertexAttribArray gl location))

      (js/bindAndSetArray data (into-array updated-pointer) gl (.-ARRAY_BUFFER gl))
      { name updated-comp })))

(defn render-uniform
  [{ :keys [name shader-var data data-type] :as comp}, gl]

  (when (has-changed? comp)
    (let [program (get-in @reconciler [:last-used :data])
          location
            (or
              (get-in @reconciler [name :location])
              (.getUniformLocation gl program shader-var))
          data-with-location (into [location] data)
          updated-comp (merge comp { :location location :data-with-location data-with-location })]

    (js/setUniform (into-array data-with-location) data-type gl)
    { name updated-comp })))

(defn render-element-arr
  [{ :keys [name shader-var data data-type] :as comp}, gl]

  (when (has-changed? comp)
    (let [program (get-in @reconciler [:last-used :data])
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
  (println "IN PROCESS" type)
  (cond
    (= type "program")      (bind-program comp gl)
    (= type "attribute")    (render-attribute comp gl)
    (= type "uniform")      (render-uniform comp gl)
    (= type "element_arr")  (render-element-arr comp gl)
    (= type "draw")         (draw-it comp gl)
    :else (.error js/console "Cannot render component of type:" (type))))

(defn update-reconciler
  [updates]
  (println "update-reconciler")
  (->>  updates
        (filter (complement nil?))
        (into @reconciler)
        (reset! reconciler)))

(defn map-and-set-list
  [gl list]
  (reset! prev-list list)
  (map (partial process gl) list))

(defn render
  [gl components]
  (let
    [ updated-components
      (if-not (= (:list @reconciler) components)
        (map-and-set-list gl components)
        []) ]

    ;(println "UDATED COPS" updated-components)
    (update-reconciler updated-components)))
