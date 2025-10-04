interface IThisProps {
  className: string;
}

function IconCompany({ className }: IThisProps) {
  return (
    <svg
      width="27"
      height="17"
      viewBox="0 0 27 17"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.47566 0.858398H0.0507812V16.8584H7.47566V0.858398ZM26.0508 0.858398H18.6259V16.8584H26.0508V0.858398Z"
      />
    </svg>
  );
}

export default IconCompany;
