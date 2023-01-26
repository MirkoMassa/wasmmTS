(module 

(func $fib (param $n i32) (result i32)
  (if (i32.lt_u (local.get $n) (i32.const 2))
      (local.get $n)
      (i32.add 
        (call $fibonacci (i32.sub (local.get $n) (i32.const 1))) 
        (call $fibonacci (i32.sub (local.get $n) (i32.const 2)))
      )
  )
)
)

(module 

(func $iterativefib (param $n i32) (result i32)
;; lt_u : less than unsigned, in that case takes 2 integers as parameters
  (if (i32.lt_u (local.get $n) (i32.const 2))
      (local.get $n)
      (i32.add 
        (call $fibonacci (i32.sub (local.get $n) (i32.const 1))) 
        (call $fibonacci (i32.sub (local.get $n) (i32.const 2)))
      )
  )
)
)