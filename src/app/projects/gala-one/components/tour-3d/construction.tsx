const items = [
  <iframe
    key="hall-360-1"
    width="100%"
    height="600"
    frameBorder="0"
    allow="xr-spatial-tracking; gyroscope; accelerometer"
    allowFullScreen
    scrolling="no"
    className="h-[70dvh] rounded-2xl"
    src="https://kuula.co/share/h3VfS?logo=1&info=0&logosize=110&fs=1&vr=0&thumbs=3&inst=0"
  />,
  <iframe
    key="hall-360-2"
    width="100%"
    height="600"
    frameBorder="0"
    allow="xr-spatial-tracking; gyroscope; accelerometer"
    allowFullScreen
    scrolling="no"
    className="h-[70dvh] rounded-2xl"
    src="https://kuula.co/share/h3VfS?logo=1&info=0&logosize=110&fs=1&vr=0&thumbs=3&inst=0"
  />,
];

interface IThisProps {
  activeIndex: number;
}

function Halls({ activeIndex }: IThisProps) {
  return <div className="w-full">{items[activeIndex]}</div>;
}

export default Halls;
