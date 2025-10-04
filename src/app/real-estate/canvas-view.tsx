"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { filesLink } from "@/utils/consts";
import { ActionGetObject } from "@/app/actions/admin/objects/get-objects";
import clsx from "clsx";
import { Spinner, Chip, Divider, addToast, Button } from "@heroui/react";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import { formatKzt } from "@/utils/helpers";
import { setHouse, setObjectInfo } from "@/redux/modals";
import { useDispatch } from "react-redux";
import { ActionGetObjectInfo } from "@/app/actions/admin/objects/get-object-info";

type Point = { x: number; y: number };
type Polygon = {
  id: number;
  realIdForDb: number;
  color: string;
  points: Point[];
  data?: any;
};

interface IThisProps {
  objectInfo: IObjectData;
  project: IProjectMerged;
  onClose: () => void;
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function CanvasView({ objectInfo, project, onClose }: IThisProps) {
  const dispatch = useDispatch();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const virtualWidth = 1300;
  const virtualHeight = 700;

  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hoveredPolygon, setHoveredPolygon] = useState<Polygon | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipData, setTooltipData] = useState<IHouse | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<Point | null>(null);
  const dragOffsetStart = useRef<Point>({ x: 0, y: 0 });

  const imagePath = `${filesLink}${objectInfo.image_path}`;
  const lastTouchDistance = useRef<number | null>(null);

  // Disable page zoom / scroll-zoom on mobile
  useEffect(() => {
    const preventDefault = (e: any) => e.preventDefault();
    document.addEventListener("gesturestart", preventDefault);
    document.addEventListener("gesturechange", preventDefault);
    document.addEventListener("gestureend", preventDefault);
    return () => {
      document.removeEventListener("gesturestart", preventDefault);
      document.removeEventListener("gesturechange", preventDefault);
      document.removeEventListener("gestureend", preventDefault);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) {
        return;
      }
      const container = containerRef.current;
      const canvas = canvasRef.current;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      const scaleX = canvas.width / virtualWidth;
      const scaleY = canvas.height / virtualHeight;
      const newScale = Math.min(scaleX, scaleY);

      setScale(newScale);
      setOffset({
        x: (canvas.width - virtualWidth * newScale) / 2,
        y: (canvas.height - virtualHeight * newScale) / 2,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    ActionGetObject(project.project_id).then((res) => {
      setPolygons(
        res.data.map((object) => ({
          id: object.project_house_id,
          realIdForDb: object.id,
          color: object.color,
          points: JSON.parse(object.coordinates || "[]"),
        })) as any,
      );
    });

    const img = new Image();
    img.src = imagePath;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
  }, [objectInfo, project]);

  const fetchTooltipData = async (polygon: Polygon): Promise<IHouse | null> => {
    setLoadingData(true);
    try {
      const result = await ActionGetProjectsProperty("/house", {
        isArchive: false,
        status: ["AVAILABLE"],
        id: polygon.id,
      });

      const house = result.data.find((h: IHouse) => h.id === polygon.id);
      if (house) {
        setTooltipData(house);
        return house;
      }
    } catch (e) {
      console.error("Ошибка при загрузке данных:", e);
    } finally {
      setLoadingData(false);
    }
    return null;
  };

  const getVirtualCoords = (clientX: number, clientY: number): Point => {
    if (!canvasRef.current) {
      return { x: 0, y: 0 };
    }
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offset.x) / scale,
      y: (clientY - rect.top - offset.y) / scale,
    };
  };

  const getPhysicalCoords = (virtualX: number, virtualY: number): Point => ({
    x: virtualX * scale + offset.x,
    y: virtualY * scale + offset.y,
  });

  const handleHover = useCallback(
    debounce((polygon: Polygon | null) => {
      setHoveredPolygon(polygon);
      if (polygon && !polygon.data) {
        fetchTooltipData(polygon);
      }
    }, 100),
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging && dragStart.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setOffset({
          x: dragOffsetStart.current.x + dx,
          y: dragOffsetStart.current.y + dy,
        });
        return;
      }
      const { x, y } = getVirtualCoords(e.clientX, e.clientY);
      const hovered = polygons.find((poly) =>
        isPointInPolygon({ x, y }, poly.points),
      );
      if (hovered) {
        if (activeHoverId !== hovered.id) {
          setActiveHoverId(hovered.id);
          const center = getPolygonCenter(hovered.points);
          const pos = getPhysicalCoords(center.x, center.y);
          setTooltipPosition({
            x: pos.x + e.currentTarget.getBoundingClientRect().left,
            y: pos.y + e.currentTarget.getBoundingClientRect().top,
          });
          handleHover(hovered);
        }
      } else if (activeHoverId !== null) {
        setActiveHoverId(null);
        handleHover(null);
      }
    },
    [polygons, activeHoverId, handleHover, isDragging],
  );

  const handleMouseLeave = useCallback(() => {
    setActiveHoverId(null);
    handleHover(null);
  }, [handleHover]);

  const handleMouseDownCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOffsetStart.current = { ...offset };
  };

  const handleMouseUpCanvas = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  // ---------- Mouse wheel zoom ----------
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) {
      return;
    }

    const zoomFactor = 1.1;
    const { x, y } = getVirtualCoords(e.clientX, e.clientY);

    const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
    const clampedScale = Math.min(Math.max(newScale, 0.5), 5);

    setScale(clampedScale);
    setOffset({
      x: e.clientX - x * clampedScale,
      y: e.clientY - y * clampedScale,
    });
  };

  // ---------- Touch handlers ----------
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragOffsetStart.current = { ...offset };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && lastTouchDistance.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);

      const scaleFactor = newDistance / lastTouchDistance.current;
      const midpointX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midpointY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const { x, y } = getVirtualCoords(midpointX, midpointY);

      const newScale = Math.min(Math.max(scale * scaleFactor, 0.5), 5);
      setScale(newScale);
      setOffset({
        x: midpointX - x * newScale,
        y: midpointY - y * newScale,
      });

      lastTouchDistance.current = newDistance;
    } else if (e.touches.length === 1 && isDragging && dragStart.current) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setOffset({
        x: dragOffsetStart.current.x + dx,
        y: dragOffsetStart.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistance.current = null;
    setIsDragging(false);
    dragStart.current = null;
  };

  // ---------- Click on polygon ----------

  let currentTooltipData = tooltipData;

  const handleClickCanvas = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      return;
    }

    const { x, y } = getVirtualCoords(e.clientX, e.clientY);
    const clickedPoly = polygons.find((poly) =>
      isPointInPolygon({ x, y }, poly.points),
    );
    if (!clickedPoly) {
      return;
    }

    addToast({ title: "Подождите пожалуйста", color: "warning" });

    if (!currentTooltipData || currentTooltipData.id !== clickedPoly.id) {
      const house = await fetchTooltipData(clickedPoly);
      if (!house) {
        addToast({ title: "Ошибка загрузки информации", color: "danger" });
        return;
      }
      currentTooltipData = house;
    }

    if (window.innerWidth > 640) {
      ActionGetObjectInfo(clickedPoly.id, "/house").then((res) => {
        if (res.status) {
          const object: any = { ...res.data };
          ActionGetObject(object.id)
            .then((resultObjects) => {
              dispatch(setHouse(currentTooltipData));
              dispatch(setObjectInfo(resultObjects.data as IObjectData[]));
              addToast({
                title: `Спасибо, можете смотреть ${currentTooltipData?.title}`,
                color: "success",
              });
            })
            .finally(() => onClose());
        }
      });
    }
  };

  // ---------- Helpers ----------
  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) {
        inside = !inside;
      }
    }
    return inside;
  };

  const getPolygonCenter = (points: Point[]): Point => {
    const c = { x: 0, y: 0 };
    points.forEach((p) => {
      c.x += p.x;
      c.y += p.y;
    });
    c.x /= points.length;
    c.y /= points.length;
    return c;
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageLoaded) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    if (imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0, virtualWidth, virtualHeight);
    }

    polygons.forEach((poly) => drawPolygon(ctx, poly, poly === hoveredPolygon));
    ctx.restore();
  };

  const drawPolygon = (
    ctx: CanvasRenderingContext2D,
    poly: Polygon,
    isHovered: boolean,
  ) => {
    if (poly.points.length < 2) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(poly.points[0].x, poly.points[0].y);
    poly.points.forEach((p, i) => i > 0 && ctx.lineTo(p.x, p.y));
    if (poly.points.length >= 3) {
      ctx.closePath();
    }

    ctx.fillStyle = `${poly.color}${isHovered ? "80" : "40"}`;
    ctx.strokeStyle = poly.color;
    ctx.lineWidth = (isHovered ? 2.5 : 1.5) / scale;
    ctx.fill();
    ctx.stroke();
  };

  function openMobilePlanModal() {
    if (hoveredPolygon) {
      addToast({ title: "Подождите пожалуйста", color: "warning" });

      ActionGetObjectInfo(hoveredPolygon.id, "/house").then((res) => {
        if (res.status) {
          const object: any = { ...res.data };
          ActionGetObject(object.id)
            .then((resultObjects) => {
              dispatch(setHouse(currentTooltipData));
              dispatch(setObjectInfo(resultObjects.data as IObjectData[]));
              addToast({
                title: `Спасибо, можете смотреть`,
                color: "success",
              });
            })
            .finally(() => onClose());
        }
      });
    }
  }

  useEffect(() => {
    redraw();
  }, [polygons, imageLoaded, scale, offset, hoveredPolygon]);

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 w-full h-[100dvh] z-[10] overflow-hidden touch-none"
    >
      <img
        src={imagePath}
        alt="image fon"
        className="w-full h-full object-cover absolute left-0 top-0 blur-[5px]"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[1000] cursor-pointer touch-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDownCanvas}
        onMouseUp={handleMouseUpCanvas}
        onMouseOut={handleMouseUpCanvas}
        onClick={handleClickCanvas}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Tooltip */}
      <div
        className={clsx(
          "absolute bg-white text-black p-4 rounded-[12px] shadow-lg z-[2000] sm:pointer-events-none transition w-full sm:min-w-[350px] min-h-[250px] max-[639px]:left-0 max-[639px]:bottom-0",
          {
            "opacity-100": hoveredPolygon,
            "opacity-0": !hoveredPolygon,
          },
        )}
        style={{
          left: `${window.innerWidth > 639 ? tooltipPosition.x : 0}px`,
          top: window.innerWidth > 639 ? `${tooltipPosition.y}px` : "unset",
          transform:
            window.innerWidth > 639 ? "translate(20%, -40%)" : "inherit",
          width: window.innerWidth > 639 ? "300px" : "100%",
        }}
      >
        {loadingData ? (
          <div className="w-full h-[100px] flex-jc-c">
            <Spinner />
          </div>
        ) : tooltipData ? (
          <div className="w-full">
            <div className="w-full flex-jsb-c">
              <h3 className="font-semibold">{tooltipData.title}</h3>
              {window.innerWidth > 640 ? (
                tooltipData.salesStart ? (
                  <Chip>
                    {tooltipData.salesStart?.month}.
                    {tooltipData.salesStart?.year}
                  </Chip>
                ) : null
              ) : (
                <Button size="sm" color="primary" onPress={openMobilePlanModal}>
                  Смотреть планировки
                  <i className="fa-regular fa-chevron-right"></i>
                </Button>
              )}
            </div>
            <Divider className="my-4" />
            <div className="flex-js-s mb-2">
              <span className="text-black/60 mr-2">Адрес:</span>
              {tooltipData.address.full}
            </div>
            <Divider className="my-4" />
            <div className="w-full flex-jsb-s">
              <h4 className="text-blue">
                <b>{tooltipData.propertyCount}</b> квартир
              </h4>
              <div className="text-right">
                <h3 className="text-[15px]">
                  от {formatKzt(tooltipData.minPrice)}
                </h3>
                <h3 className="text-[15px]">
                  от {formatKzt(tooltipData.minPriceArea)}/м²
                </h3>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <i
        className="fa-light fa-xmark bg-white w-[40px] h-[40px] rounded-full flex-jc-c absolute top-6 right-6 z-[1000] text-[30px] text-black/60 hover:text-black cursor-pointer"
        onClick={onClose}
      />
    </div>
  );
}

export default CanvasView;
