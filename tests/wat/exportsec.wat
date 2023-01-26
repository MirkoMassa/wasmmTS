(module 
  ;; func
  (func $a) 
  (export "a" (func $a))
  ;; global
  (global i32 (i32.const 0)) 
  (global i32 (i32.const 0)) 
  (export "g1" (global 0)) (export "g2" (global 1))
  ;; table
  (table $tab 0 funcref) 
  (export "extable" (table $tab))
  ;; memory
  (memory $mem 0) 
  (export "exmemory" (memory $mem))
)