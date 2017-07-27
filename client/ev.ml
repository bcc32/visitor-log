let submit_and_prevent_default msg =
  let handle_event event =
    event##preventDefault ();
    event##stopPropagation ();
    Some msg
  in
  Tea.Html.onCB "submit" "" handle_event
;;
