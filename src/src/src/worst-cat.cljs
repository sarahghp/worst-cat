(ns worst-cat.core)

(defn hello-friend
  []
  "hello from the other file")

(def reconciler (atom {}))
(def prev-list (atom {}))


;; --------------- test fns -----------------

(defn is-new?
  [{:keys [name]}]
  (contains? @reconciler name))

(defn has-changed?
  [{ :keys [name re-render] :as comp }]
  (or re-render (not (= (@reconciler name) comp ))))

;; ---------- gl binding & call fns ---------------
(defn bind-set-array
  [{:keys [data pointer] :as comp} gl buffer-type]

  (let [buffer (.createBuffer gl)]
    (.bindBuffer buffer-type buffer)
    (.bufferData buffer-type data gl.STATIC_DRAW))

    (when (= buffer-type (-.ARRAY_BUFFER gl))
      ;; gl.vertexAttribPointer.apply(gl, component.get('pointer'))
      (.vertexAttribPointer.apply gl pointer)
    ))

;; --------------- processing fns -----------------

(defn bind-program
  [{ :keys [type name data] :as comp}, gl]

  (when-not (= (@reconciler :last-used) comp)
    (when (is-new? comp)
      (swap! reconciler (merge {:last-used comp})))
    (.useProgram gl data)
    { name comp }))

(defn render-attribute
  [{ :keys [type name data shader-var] :as comp}, gl]

  (when-not (has-changed? comp)
    (let [location
          (or
            (get-in @reconciler [:name :location])
            (.getAttribLocation gl program shader-var))
          updated-comp (merge (update-in comp :pointer #(into [location] %)) { :location location })]

      (when (is-new? comp)
        (.enableVertexAttribArray gl location))

      (bind-set-array comp gl (-.ARRAY_BUFFER gl))
      { name component })))



;; --------------- reconciler -----------------

(defn process
  [{:keys [type] :as comp} gl]
  (cond
    (= type "program")      (bind-program comp gl)
    (= type "attribute")    (render-attribute comp gl)
    (= type "uniform")      (renderUniform comp gl)
    (= type "element_arr")  (renderElementArray comp gl)
    (= type "draw")         (drawIt comp gl)
    :else (.error js/console "Cannot render component of type:" (type))))

(defn update-reconciler
  [updates]
  (->>  updates
        (filter (complement nil?))
        (into @reconciler)
        (reset! reconciler)))

(defn map-and-set-list
  [list]
  (reset! prev-list list)
  (map process list))

(defn render
  [gl components]
  (let
    [ updated-components
      (if-not (= (:list @reconciler) components)
        (map-and-set-list components)
        []) ]
    (update-reconciler updated-components)))
