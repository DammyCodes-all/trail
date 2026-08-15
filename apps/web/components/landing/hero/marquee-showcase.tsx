import MarqueeAlongSvgPath from "@/components/ui/marquee-along-svg-path";

const path =
  "M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5";

const imgs = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=160&q=80",
];

export function MarqueeShowcase() {
  return (
    <div className="relative mt-14 w-full sm:mt-16">
      <MarqueeAlongSvgPath
        path={path}
        viewBox="0 0 996 330"
        baseVelocity={8}
        slowdownOnHover
        draggable
        repeat={2}
        dragSensitivity={0.1}
        responsive
        grabCursor
        className="h-[340px] w-full sm:h-[420px]"
      >
        {imgs.map((src, i) => (
          <div
            key={i}
            className="w-16 duration-300 ease-in-out hover:z-10 hover:scale-150 sm:w-20"
          >
            <img
              src={src}
              alt=""
              draggable={false}
              className="h-16 w-full rounded-md object-cover ring-1 ring-white/10 sm:h-20"
            />
          </div>
        ))}
      </MarqueeAlongSvgPath>
    </div>
  );
}