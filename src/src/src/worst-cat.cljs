(ns worst-cat.core)

(defn hello-friend
  []
  "hello from the other file")

(def reconciler (atom {}))
(def prev-list (atom {}))

;; --------------- processing fns -----------------
(defn bind-program
  [{ :keys [type name] :as comp}, gl]
  ;; if it is the same as last used return nil
  ;; if it is new, set directly in reconciler
  ;; then, as long as it is not the same, make gl call and return key and value in a map
  )

;; --------------- reconciler -----------------

(defn process
  [{:keys [type] :as comp} gl]
  (cond
    (= type "program")      (bind-program comp gl)
    (= type "attribute")    (renderAttribute comp gl)
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
