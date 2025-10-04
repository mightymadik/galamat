"use client";

import { addToast, Button, Tooltip } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { filesLink, filesLinkRemove, filesLinkSave } from "@/utils/consts";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import { RandomKey } from "@/utils/helpers";
import clsx from "clsx";
import { ActionGetObject } from "@/app/actions/admin/objects/get-objects";
import { ActionCreateObject } from "@/app/actions/admin/objects/create-object";
import { ActionRemoveObject } from "@/app/actions/admin/objects/remove-object";
import axios from "axios";
import { ActionUpdateFasadeInfo } from "@/app/actions/admin/objects/change-fasade-info";
import { Spinner } from "@heroui/react";

type Point = { x: number; y: number };
type Polygon = {
  id: number;
  realIdForDb: number;
  color: string;
  points: Point[];
};

interface IThisProps {
  objectInfo: IObjectData;
  project: IProjectStage;
}

function CanvasEditor({ objectInfo, project }: IThisProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [addingMode, setAddingMode] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<Polygon | null>(null);
  const [editingPolygonId, setEditingPolygonId] = useState<number | null>(null);
  const [hoveredPolygonId, setHoveredPolygonId] = useState<number | null>(null);
  const [selectedPolygonId, setSelectedPolygonId] = useState<number | null>(
    null,
  );

  const [mouse, setMouse] = useState<Point | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(
    null,
  );
  const [hoveringPoint, setHoveringPoint] = useState<boolean>(false);

  const [color, setColor] = useState("#00ccff");

  const [object, setObject] = useState<IObjectData>(objectInfo);

  const imagePath = `${filesLink}${object.image_path}`;

  const [houses, setHouses] = useState<IHouse[]>([]);

  const api_url =
    objectInfo.api_url === "/projects"
      ? "/house"
      : objectInfo.api_url === "/house"
        ? "/floor"
        : "";

  useEffect(() => {
    ActionGetProjectsProperty(api_url, {
      isArchive: false,
      status: ["AVAILABLE"],
      projectId: project.id,
    }).then((result) => {
      setHouses(result.data);
    });

    ActionGetObject(project.id).then((res) => {
      const Data = [...res.data].map((object) => {
        return {
          id: object.id,
          realIdForDb: object.project_house_id,
          color: object.color,
          points: JSON.parse(object.coordinates || "[]"),
        };
      });

      setPolygons(Data as Polygon[]);
    });
  }, [objectInfo]);

  const [loadingSaving, setLoadingSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function SaveAllChanges() {
    const createPlaygoneFetch = polygons.map((polygon) => {
      return ActionCreateObject(polygon.realIdForDb, {
        color: polygon.color,
        api_url,
        parent_id: project.id,
        project_house_id: polygon.id,
        image_path: null,
        coordinates: JSON.stringify(polygon.points),
      });
    });
    addToast({
      title: "Ждите пожалуйста",
      color: "warning",
    });
    setLoadingSaving(true);
    Promise.all(createPlaygoneFetch)
      .then(() => {
        addToast({
          title: "Успешно сохранено",
          color: "success",
        });
        setSaved(true);
      })
      .finally(() => setLoadingSaving(false));
  }

  // Load image on mount
  useEffect(() => {
    const img = new Image();
    img.src = imagePath;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
  }, [imagePath]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    redraw();
  }, [
    polygons,
    currentPolygon,
    mouse,
    imageLoaded,
    zoom,
    offset,
    hoveredPolygonId,
    selectedPolygonId,
  ]);

  // Canvas interaction handlers
  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    const scaleAmount = 1.1;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offset.x) / zoom;
    const mouseY = (e.clientY - rect.top - offset.y) / zoom;

    const newZoom =
      e.deltaY < 0
        ? Math.min(zoom * scaleAmount, 5)
        : Math.max(zoom / scaleAmount, 0.2);

    setOffset((prev) => ({
      x: prev.x - (mouseX * newZoom - mouseX * zoom),
      y: prev.y - (mouseY * newZoom - mouseY * zoom),
    }));
    setZoom(newZoom);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button === 1 || e.button === 2) {
      // Middle or right mouse button
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const { x, y } = getRelativeCoords(e);

    // If in adding mode, handle polygon point addition
    if (addingMode && currentPolygon) {
      // Check if clicking on existing point
      const hitIdx = currentPolygon.points.findIndex(
        (p) => Math.hypot(p.x - x, p.y - y) < 8 / Math.sqrt(zoom),
      );
      if (hitIdx !== -1) {
        setDraggingPointIndex(hitIdx);
        return;
      }

      // Add new point
      setCurrentPolygon({
        ...currentPolygon,
        points: [...currentPolygon.points, { x, y }],
      });
      return;
    }

    // Select polygon on click
    let clickedPolygon = false;
    polygons.forEach((poly) => {
      if (isPointInPolygon({ x, y }, poly.points)) {
        setSelectedPolygonId(poly.id);
        clickedPolygon = true;
      }
    });

    // Start editing if clicked on hovered polygon
    if (hoveredPolygonId && !clickedPolygon) {
      const polygonToEdit = polygons.find((p) => p.id === hoveredPolygonId);
      if (polygonToEdit) {
        setEditingPolygonId(hoveredPolygonId);
        setCurrentPolygon(polygonToEdit);
        setAddingMode(true);
        setSelectedPolygonId(hoveredPolygonId);
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = getRelativeCoords(e);
    setMouse({ x, y });

    // Handle panning
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle point dragging
    if (addingMode && draggingPointIndex !== null && currentPolygon) {
      const updatedPoints = [...currentPolygon.points];
      updatedPoints[draggingPointIndex] = { x, y };
      setCurrentPolygon({
        ...currentPolygon,
        points: updatedPoints,
      });
      return;
    }

    // Handle hover effects
    if (addingMode && currentPolygon) {
      // Check if hovering over any point
      const hitRadius = 8 / Math.sqrt(zoom);
      const hit = currentPolygon.points.some(
        (p) => Math.hypot(p.x - x, p.y - y) < hitRadius,
      );
      setHoveringPoint(hit);
    } else {
      // Check if hovering over any polygon
      let foundHover = false;
      polygons.forEach((poly) => {
        if (isPointInPolygon({ x, y }, poly.points)) {
          setHoveredPolygonId(poly.id);
          foundHover = true;
        }
      });
      if (!foundHover) {
        setHoveredPolygonId(null);
      }
    }
  }

  function handleMouseUp() {
    setIsPanning(false);
    setPanStart(null);
    setDraggingPointIndex(null);
  }

  // Helper functions
  function getRelativeCoords(e: React.MouseEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / zoom,
      y: (e.clientY - rect.top - offset.y) / zoom,
    };
  }

  function isPointInPolygon(point: Point, polygon: Point[]): boolean {
    if (polygon.length < 3) {
      return false;
    }

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
  }

  function getPolygonCenter(points: Point[]): Point {
    const center = { x: 0, y: 0 };
    if (points.length === 0) {
      return center;
    }

    points.forEach((point) => {
      center.x += point.x;
      center.y += point.y;
    });

    center.x /= points.length;
    center.y /= points.length;

    return center;
  }

  // Action handlers
  function handleResetView() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleUndo() {
    if (addingMode && currentPolygon) {
      if (currentPolygon.points.length > 0) {
        setCurrentPolygon({
          ...currentPolygon,
          points: currentPolygon.points.slice(0, -1),
        });
      } else {
        setAddingMode(false);
        setCurrentPolygon(null);
        setEditingPolygonId(null);
      }
    } else if (polygons.length > 0) {
      setPolygons((prev) => prev.slice(0, -1));
    }
  }

  function handleDeletePolygon() {
    if (selectedPolygonId) {
      const fontPolygon = polygons.find((p) => p.id === selectedPolygonId);

      if (fontPolygon) {
        ActionRemoveObject(fontPolygon.id).then(() => {
          console.log("polygon removed");
        });
      }

      setPolygons(polygons.filter((p) => p.id !== selectedPolygonId));
      setSelectedPolygonId(null);
      if (editingPolygonId === selectedPolygonId) {
        setEditingPolygonId(null);
        setAddingMode(false);
        setCurrentPolygon(null);
      }
    }
  }

  const [createObject, setCreateObject] = useState<boolean>(false);

  function handleAddNewPolygon() {
    setCreateObject(!createObject);
  }

  function createNewObject(id: number) {
    setCreateObject(false);
    setAddingMode(true);
    setCurrentPolygon({
      id,
      realIdForDb: 99999999,
      color,
      points: [],
    });
    setSelectedPolygonId(null);
    setEditingPolygonId(null);

    addToast({
      title: "Дом выбран, начинаем отмечать точки",
      color: "success",
    });
  }

  function handleFinishPolygon() {
    if (currentPolygon && currentPolygon.points.length >= 3) {
      if (editingPolygonId) {
        // Update existing polygon
        setPolygons(
          polygons.map((p) => (p.id === editingPolygonId ? currentPolygon : p)),
        );
      } else {
        // Add new polygon
        setPolygons([...polygons, currentPolygon]);
      }
      setCurrentPolygon(null);
      setAddingMode(false);
      setEditingPolygonId(null);
    }
  }

  function handleCancelEditing() {
    setCurrentPolygon(null);
    setAddingMode(false);
    setEditingPolygonId(null);
    setSelectedPolygonId(null);
  }

  // Drawing functions
  function redraw() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageLoaded) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw image
    if (imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    }

    // Draw all polygons
    polygons.forEach((poly) => {
      drawPolygon(ctx, poly, poly.id === selectedPolygonId);
    });

    // Draw current editing polygon
    if (currentPolygon) {
      drawPolygon(ctx, currentPolygon, true);
    }

    // Draw mouse pointer when adding points
    if (mouse && addingMode) {
      const pointerRadius = 4 / Math.sqrt(zoom);
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, pointerRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 255, 0.7)";
      ctx.fill();
    }

    ctx.restore();
  }

  function drawPolygon(
    ctx: CanvasRenderingContext2D,
    poly: Polygon,
    isSelected: boolean,
  ) {
    if (poly.points.length < 2) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(poly.points[0].x, poly.points[0].y);
    for (let i = 1; i < poly.points.length; i++) {
      ctx.lineTo(poly.points[i].x, poly.points[i].y);
    }

    // Fill and stroke the polygon
    if (poly.points.length >= 0) {
      ctx.closePath();
      ctx.fillStyle = `${poly.color}${
        isSelected ? "80" : poly.id === hoveredPolygonId ? "60" : "40"
      }`;
      ctx.fill();
    }

    // Draw the outline
    ctx.strokeStyle = poly.color;
    ctx.lineWidth = isSelected ? 2 / zoom : 1.5 / zoom;
    ctx.stroke();

    // Draw edit icon for hovered polygon
    if (poly.id === hoveredPolygonId && !addingMode && !isSelected) {
      const center = getPolygonCenter(poly.points);
      const iconSize = 18 / zoom;

      // Draw edit icon background
      ctx.beginPath();
      ctx.arc(center.x, center.y, iconSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 1 / zoom;
      ctx.stroke();

      // Draw pencil icon
      ctx.beginPath();
      ctx.moveTo(center.x - iconSize / 3, center.y + iconSize / 3);
      ctx.lineTo(center.x + iconSize / 3, center.y - iconSize / 3);
      ctx.lineTo(center.x + iconSize / 1.5, center.y);
      ctx.lineTo(center.x, center.y + iconSize / 1.5);
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fill();
    }

    // Draw points for active/selected polygon
    if (isSelected || poly.id === editingPolygonId) {
      const pointRadius = Math.max(2, 5 / Math.sqrt(zoom));

      poly.points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = poly.color;
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
      });
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
  }

  // Dynamic cursor style
  const dynamicCursor = isPanning
    ? "grabbing"
    : addingMode && hoveringPoint
      ? "move"
      : addingMode
        ? "crosshair"
        : hoveredPolygonId && !editingPolygonId
          ? "pointer"
          : "grab";

  const [loadingUpdating, setLoadingUpdating] = useState(false);

  function ChangeImage(e: any) {
    const file = e.target.files[0];
    if (file && objectInfo) {
      const formData = new FormData();
      formData.append("image", file);

      setLoadingUpdating(true);
      addToast({
        title: "Подождите немного",
        color: "warning",
      });

      axios
        .post(filesLinkRemove, {
          url: object.image_path,
        })
        .then(() => {
          axios.post(filesLinkSave, formData).then(({ data }) => {
            if (data.status === "success") {
              addToast({
                title: "Осталось чуть чуть",
                color: "warning",
              });
              ActionUpdateFasadeInfo(object?.id, "image_path", data.url)
                .then((res) => {
                  if (res.status) {
                    setObject(res.data as IObjectData);
                    addToast({
                      title: "Успешно добавлено ",
                      color: "success",
                    });
                  }
                })
                .finally(() => setLoadingUpdating(false));
            }
          });
        });
    }
  }

  return (
    <div className="w-full flex flex-col items-center gap-4 p-4">
      <div className="w-full max-w-[1300px] flex-jsb-c gap-4 mb-4 mt-6">
        <div className="flex-js-c gap-4">
          <Button
            onPress={handleUndo}
            variant="flat"
            className="!max-w-[20px] !px-0"
            isDisabled={
              !(
                (addingMode && currentPolygon?.points.length) ||
                (!addingMode && polygons.length)
              )
            }
          >
            <i className="fa-regular fa-rotate-left"></i>
          </Button>
          <Button onPress={handleResetView}>Сбросить зум</Button>
        </div>

        <div className="flex-je-c gap-4">
          {addingMode ? (
            <>
              <Button
                onPress={handleFinishPolygon}
                color="success"
                isDisabled={!currentPolygon || currentPolygon.points.length < 3}
              >
                Сохранить
              </Button>
              <Button
                onPress={handleCancelEditing}
                variant="flat"
                color="danger"
              >
                Отменить
              </Button>
            </>
          ) : (
            <>
              <Button onPress={handleAddNewPolygon} color="secondary">
                Добавить объект
              </Button>
              <Button
                onPress={handleDeletePolygon}
                variant="flat"
                color="danger"
                isDisabled={!selectedPolygonId}
              >
                Удалить
              </Button>
            </>
          )}

          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 cursor-pointer"
          />
          <span className="w-[80px] text-center">
            {(zoom * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="flex-jsb-c gap-4 relative">
        <div className="w-full max-w-[1300px] relative">
          <canvas
            ref={canvasRef}
            width={1300}
            height={700}
            style={{
              width: "100%",
              height: "auto",
              cursor: dynamicCursor,
            }}
            className="shadow bg-white"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
          />

          <Tooltip content="Изменить картинку ">
            <label className="w-10 h-10 rounded-full text-black/50 hover:text-black cursor-pointer flex-jc-c bg-white absolute top-2 right-2">
              <input type="file" className="hidden" onChange={ChangeImage} />
              {loadingUpdating ? (
                <Spinner size="sm" />
              ) : (
                <i className="fa-solid fa-pen"></i>
              )}
            </label>
          </Tooltip>

          {addingMode && currentPolygon && (
            <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-2 rounded-md shadow">
              <p className="text-sm font-medium">
                {currentPolygon.points.length < 3 ? (
                  <span className="text-yellow-600">
                    Добавьте минимум 3 точки ({currentPolygon.points.length}/3)
                  </span>
                ) : (
                  <span className="text-green-600">
                    Готово к сохранению ({currentPolygon.points.length} точек)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
        <div
          className={clsx(
            "w-0 h-full border-l p-0 absolute right-0 top-0 backdrop-blur-[5px] bg-black/20 transition-all overflow-hidden overflow-y-auto",
            {
              "!w-[350px] p-2 ": createObject,
            },
          )}
        >
          <div className="flex-jsb-c">
            <h3 className="mb-4 text-[18px]">Выберите дом</h3>
            <i
              className="fa-regular fa-xmark mb-4 text-black/50 text-[20px] cursor-pointer"
              onClick={() => setCreateObject(false)}
            ></i>
          </div>
          {houses.map((house) =>
            !polygons.some((_p) => _p.id === house.id) ? (
              <div
                key={RandomKey()}
                className="flex-js-s gap-2 bg-white/20 hover:bg-white/40 p-2 rounded-[8px] mb-2 relative"
              >
                <img
                  src={house.image}
                  alt="huse image"
                  className="w-[100px] h-[100px] rounded-[10px]"
                />
                <div>
                  <h3>{house.title}</h3>
                  <Button
                    size="sm"
                    color="primary"
                    className="mt-4 absolute right-2 bottom-2"
                    onPress={() => createNewObject(house.id)}
                  >
                    Выбрать
                  </Button>
                </div>
              </div>
            ) : null,
          )}
        </div>
      </div>

      <div className="flex-je-c w-full max-w-[1300px]">
        <div>
          {saved ? (
            <p className="text-green-600 mb-2 text-[14px]">Успешно сохранено</p>
          ) : null}
          <Button onPress={SaveAllChanges} isLoading={loadingSaving}>
            Сохранить общий план
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CanvasEditor;
