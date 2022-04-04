# Welcome to FUN

## This is a programming languge made with javascript that has same kind of application like LISP.

#### please refer to /lib/test.js to get the code for the PL.

#

# IDE and Compiler

[MARDA STUDIOS](https://lisp-pl.vercel.app/)

# Printing out

```
print("abuchu");
print(1 + 2 * 3);
```

# declaring Variables

### there is no type declaration. Similar to python :)

```
name = "abuchu";
print(name);

```

# if conditions

```
age = 18;

if(age >= 18)
{
    print("can drive");
}else {
    print("can't drive");
};

```

# if one liner

```
name = "abuchu"
if name == "abuchu" then print("say who?") else print("say what?");

```

# declaring functions one liner ;)

```
fib = fun(n) if n < 2 then n else fib(n - 1) + fib(n - 2);

```

# Calling a function

```
print(fib(10));
```

# loops with if

## Lists to be added soon...

```
loop_through = fun(x, y)
{
	if(x <= y ) then print(x);
    if(x + 1 <= y){
      loop_through(x + 1,  y);
  }else{
    print("")
  }
};

loop_through(1,5);

```
# Let keyword

```
let (a = 1, b = 3, c = b * a) print(c);
```

