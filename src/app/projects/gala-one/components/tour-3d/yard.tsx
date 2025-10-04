const items = [
  <iframe
    key="yard-360-1"
    width="100%"
    height="640"
    frameBorder="0"
    allow="xr-spatial-tracking; gyroscope; accelerometer"
    allowFullScreen
    scrolling="no"
    className="h-[60dvh]"
    src="https://kuula.co/share/hxHps?logo=1&info=0&logosize=110&fs=1&vr=0&thumbs=3&inst=0"
  />,
  <iframe
    key="yard-360-2"
    width="100%"
    height="640"
    frameBorder="0"
    allow="xr-spatial-tracking; gyroscope; accelerometer"
    allowFullScreen
    scrolling="no"
    className="h-[60dvh]"
    src="https://kuula.co/share/hxH0l?logo=1&info=0&logosize=110&fs=1&vr=0&thumbs=3&inst=0"
  />,
  <iframe
    key="yard-360-3"
    width="100%"
    height="640"
    frameBorder="0"
    allow="xr-spatial-tracking; gyroscope; accelerometer"
    allowFullScreen
    scrolling="no"
    className="h-[60dvh]"
    src="https://kuula.co/share/hxH09?logo=1&info=0&logosize=110&fs=1&vr=0&thumbs=3&inst=0"
  />,
];

interface IThisProps {
  activeIndex: number;
}

function Yard({ activeIndex }: IThisProps) {
  return <div className="w-full">{items[activeIndex]}</div>;
}

export default Yard;
